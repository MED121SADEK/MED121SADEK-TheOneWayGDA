import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword, generateToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, name, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check for existing user
    const existing = await db.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      )
    }

    // Create user
    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        name: name?.trim() || null,
        password: hashPassword(password),
        preferences: JSON.stringify({
          theme: 'dark',
          language: 'en',
          notifications: true,
          aiSensitivity: 0.7,
        }),
      },
    })

    // Create session
    const token = generateToken()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    await db.userSession.create({
      data: {
        userId: user.id,
        token,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent') || null,
        expiresAt,
      },
    })

    // Log activity
    await db.userActivity.create({
      data: {
        userId: user.id,
        type: 'login',
        details: JSON.stringify({ method: 'register' }),
        ipAddress: request.headers.get('x-forwarded-for') || null,
      },
    })

    // Also create/update Visitor record
    await db.visitor.upsert({
      where: { email: normalizedEmail },
      update: { name: user.name, status: 'active' },
      create: {
        email: normalizedEmail,
        name: user.name,
        status: 'active',
      },
    })

    const { password: _pw, ...safeUser } = user

    return NextResponse.json({
      user: safeUser,
      token,
      message: 'Account created successfully',
    }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Registration failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
