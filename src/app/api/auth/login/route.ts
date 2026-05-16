import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, generateToken } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    const user = await db.user.findUnique({ where: { email: normalizedEmail } })
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    if (!verifyPassword(password, user.password)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // ─── Pending users: show "under review" message ───
    if (user.role === 'pending') {
      return NextResponse.json({
        status: 'pending',
        email: user.email,
        name: user.name,
        message: 'Your access request is still under review. Our team is evaluating your application. You will receive an email notification as soon as a decision is made.',
      }, { status: 202 })
    }

    // ─── Rejected users: show declined message ───
    if (user.role === 'rejected') {
      return NextResponse.json({
        status: 'rejected',
        email: user.email,
        message: 'Your access request was declined. If you believe this is an error, please contact our support team.',
      }, { status: 403 })
    }

    // ─── Approved users: normal login flow ───
    const token = generateToken()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    await db.userSession.create({
      data: {
        userId: user.id,
        token,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        userAgent: request.headers.get('user-agent') || null,
        expiresAt,
      },
    })

    await db.user.update({ where: { id: user.id }, data: { lastSeen: new Date() } })

    await db.userActivity.create({
      data: { userId: user.id, type: 'login', details: JSON.stringify({ method: 'password' }), ipAddress: request.headers.get('x-forwarded-for') || null },
    })

    const { password: _pw, ...safeUser } = user

    return NextResponse.json({ user: safeUser, token, message: 'Login successful' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Login failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
