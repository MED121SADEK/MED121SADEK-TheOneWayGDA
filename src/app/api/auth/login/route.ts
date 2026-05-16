import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, generateToken } from '@/lib/auth'
import { db } from '@/lib/db'

// Use unified database (auto-selects in-memory on Vercel, Prisma locally)
const database = db

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const user = await database.user.findUnique({ where: { email: normalizedEmail } })
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    if (!verifyPassword(password, user.password)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const token = generateToken()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    await database.userSession.create({
      data: {
        userId: user.id,
        token,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent') || null,
        expiresAt,
      },
    })

    await database.user.update({ where: { id: user.id }, data: { lastSeen: new Date() } })

    await database.userActivity.create({
      data: { userId: user.id, type: 'login', details: JSON.stringify({ method: 'password' }), ipAddress: request.headers.get('x-forwarded-for') || null },
    })

    const { password: _pw, ...safeUser } = user

    return NextResponse.json({ user: safeUser, token, message: 'Login successful' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Login failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
