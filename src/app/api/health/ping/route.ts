/**
 * Health Ping — Lightweight endpoint for external monitoring services
 *
 * Designed for UptimeRobot, Better Uptime, Cronitor, etc.
 * Returns 200 with minimal payload and fast response.
 * Monitors: Netlify is up, DB is reachable, serverless function is alive.
 *
 * Monitoring setup:
 * - Create a free monitor at https://uptimerobot.com
 * - URL: https://theonewaygda.netlify.app/api/health/ping
 * - Type: HTTP(s)
 * - Interval: 5 minutes
 * - Expected status: 200
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const start = Date.now()

  try {
    // Quick DB connectivity check
    await db.$queryRaw`SELECT 1 as ok`
    const dbLatency = Date.now() - start

    const healthy = dbLatency < 2000

    return NextResponse.json(
      {
        status: healthy ? 'ok' : 'degraded',
        db: dbLatency < 2000 ? 'ok' : 'slow',
        latency: dbLatency,
      },
      {
        status: healthy ? 200 : 503,
        headers: {
          'Cache-Control': 'no-store',
          'X-Response-Time': `${dbLatency}ms`,
        },
      }
    )
  } catch {
    return NextResponse.json(
      { status: 'error', db: 'down', latency: Date.now() - start },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    )
  }
}