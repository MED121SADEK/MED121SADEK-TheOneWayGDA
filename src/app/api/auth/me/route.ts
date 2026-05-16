import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'

const database = db

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const session = await database.userSession.findUnique({ where: { token } })
    if (!session || new Date(session.expiresAt) < new Date()) {
      if (session) await database.userSession.delete({ where: { token } })
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    const user = await database.user.findUnique({ where: { id: session.userId } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 401 })

    const { password: _pw, ...safeUser } = user
    return NextResponse.json({ user: safeUser })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Auth check failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
