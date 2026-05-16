import { NextRequest, NextResponse } from 'next/server'
import { hashPassword, generateToken } from '@/lib/auth'
import { memDb } from '@/lib/memory-db'

// Use in-memory database (works on any platform without external database)
const database = memDb

export async function POST(request: NextRequest) {
  try {
    const { email, name, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const existing = await database.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    const user = await database.user.create({
      data: {
        email: normalizedEmail,
        name: name?.trim() || null,
        password: hashPassword(password),
        preferences: JSON.stringify({ theme: 'dark', language: 'en', notifications: true, aiSensitivity: 0.7 }),
      },
    })

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

    await database.userActivity.create({
      data: { userId: user.id, type: 'login', details: JSON.stringify({ method: 'register' }), ipAddress: request.headers.get('x-forwarded-for') || null },
    })

    await database.visitor.upsert({
      where: { email: normalizedEmail },
      update: { name: user.name, status: 'active' },
      create: { email: normalizedEmail, name: user.name, status: 'active' },
    })

    const { password: _pw, ...safeUser } = user

    return NextResponse.json({ user: safeUser, token, message: 'Account created successfully' }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Registration failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
