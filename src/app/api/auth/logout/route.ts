import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }
    await db.userSession.delete({ where: { token } })
    return NextResponse.json({ message: 'Logged out successfully' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Logout failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
