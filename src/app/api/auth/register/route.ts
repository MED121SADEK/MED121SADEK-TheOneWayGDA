import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth'
import { db } from '@/lib/db'

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

    const existing = await db.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    // Create user with 'pending' role — requires admin approval before access
    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        name: name?.trim() || null,
        password: await hashPassword(password),
        role: 'pending',
        preferences: JSON.stringify({ theme: 'dark', language: 'en', notifications: true, aiSensitivity: 0.7 }),
      },
    })

    await db.userActivity.create({
      data: {
        userId: user.id,
        type: 'registration_pending',
        details: JSON.stringify({ method: 'register', name: name?.trim() || null }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      },
    })

    await db.visitor.upsert({
      where: { email: normalizedEmail },
      update: { name: user.name, status: 'pending' },
      create: { email: normalizedEmail, name: user.name, status: 'pending' },
    })

    // Notify admin about new access request
    try {
      const { sendAdminAccessRequestEmail } = await import('@/lib/email')
      await sendAdminAccessRequestEmail(user.name, normalizedEmail, user.id, null)
    } catch {
      // Non-critical — registration still succeeds
    }

    const { password: _pw, ...safeUser } = user

    return NextResponse.json({
      user: safeUser,
      status: 'pending',
      message: 'Account created. Your request is pending admin approval.',
    }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Registration failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}