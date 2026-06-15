import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest } from '@/lib/auth'

/**
 * GET /api/notifications/stream — Server-Sent Events (SSE) endpoint
 *
 * Streams new notifications to authenticated users in real-time.
 * Uses polling internally (every 10s) to check for new notifications.
 *
 * Auth: EventSource API cannot send custom headers, so the token is
 * passed via query param (see createAuthEventSource in auth-fetch.ts).
 */
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Extract token from an SSE request.
 * Falls back to query param because EventSource cannot set Authorization headers.
 */
function getTokenForSSE(request: NextRequest): string | null {
  // Standard header-based extraction
  const headerToken = getTokenFromRequest(request)
  if (headerToken) return headerToken

  // Query-param fallback for EventSource (which cannot set custom headers)
  const queryToken = request.nextUrl.searchParams.get('token')
  if (queryToken) return queryToken

  return null
}

export async function GET(request: NextRequest) {
  const token = getTokenForSSE(request)
  if (!token) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // Authenticate
  const session = await db.userSession.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!session || session.expiresAt < new Date()) {
    if (session) await db.userSession.delete({ where: { id: session.id } })
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const userId = session.userId

  const encoder = new TextEncoder()
  let keepAliveTimer: ReturnType<typeof setInterval>
  let pollTimer: ReturnType<typeof setInterval>
  let lastChecked = new Date()
  let controller: ReadableStreamDefaultController | null = null

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl

      // Send initial connected event
      ctrl.enqueue(encoder.encode(`event: connected\ndata: {"status":"connected","userId":"${userId}"}\n\n`))

      // Keep-alive comments every 15s
      keepAliveTimer = setInterval(() => {
        try {
          ctrl.enqueue(encoder.encode(`: keepalive ${Date.now()}\n\n`))
        } catch {
          clearInterval(keepAliveTimer)
          clearInterval(pollTimer)
        }
      }, 15000)

      // Poll for new notifications every 10s
      pollTimer = setInterval(async () => {
        try {
          const newNotifs = await db.notification.findMany({
            where: {
              userId,
              createdAt: { gt: lastChecked },
            },
            orderBy: { createdAt: 'asc' },
            select: {
              id: true, type: true, title: true, message: true,
              actionUrl: true, actionLabel: true, isRead: true, createdAt: true,
            },
          })

          if (newNotifs.length > 0) {
            lastChecked = new Date()
            for (const notif of newNotifs) {
              const payload = JSON.stringify(notif)
              ctrl.enqueue(encoder.encode(`event: notification\ndata: ${payload}\n\n`))
            }
          } else {
            // Update watermark even if no notifications
            lastChecked = new Date()
          }
        } catch {
          // Silently continue on error
        }
      }, 10000)
    },
    cancel() {
      clearInterval(keepAliveTimer)
      clearInterval(pollTimer)
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
