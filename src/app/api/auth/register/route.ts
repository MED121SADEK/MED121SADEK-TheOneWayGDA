import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth'
import { db } from '@/lib/db'
import { sendAdminAccessRequestEmail } from '@/lib/email'

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
      // If user exists and is pending, tell them to wait
      if (existing.role === 'pending') {
        return NextResponse.json({
          status: 'pending',
          message: 'Your access request is still under review. Our team is evaluating your application. You will receive an email notification as soon as a decision is made.',
          email: existing.email,
        }, { status: 202 })
      }
      // If user was rejected, let them know
      if (existing.role === 'rejected') {
        return NextResponse.json({
          error: 'Your previous access request was declined. Please contact support for more information.',
        }, { status: 403 })
      }
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    // Create user with "pending" role — no access until approved by admin
    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        name: name?.trim() || null,
        password: hashPassword(password),
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

    // Send admin notification email (fire-and-forget)
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null
    sendAdminAccessRequestEmail(user.name, user.email, user.id, ipAddress).catch(() => {})

    return NextResponse.json({
      status: 'pending',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      message: 'Your access request is still under review. Our team is evaluating your application. You will receive an email notification as soon as a decision is made.',
    }, { status: 201 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Registration failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
