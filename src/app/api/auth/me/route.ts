import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Find valid session
    const session = await db.userSession.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!session || session.expiresAt < new Date()) {
      // Clean up expired session
      if (session) {
        await db.userSession.delete({ where: { id: session.id } })
      }
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    const { password: _pw, ...safeUser } = session.user

    return NextResponse.json({ user: safeUser })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Auth check failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
