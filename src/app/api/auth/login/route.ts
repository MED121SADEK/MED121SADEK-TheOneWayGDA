import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, hashPassword, generateToken } from '@/lib/auth'
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

    if (!await verifyPassword(password, user.password)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // ─── Role-based access control ───
    if (user.role === 'rejected') {
      return NextResponse.json(
        { error: 'Your account has been declined. Please contact an administrator.', status: 'rejected' },
        { status: 403 }
      )
    }

    if (user.role === 'pending') {
      return NextResponse.json(
        { error: 'Your account is pending admin approval.', status: 'pending' },
        { status: 202 }
      )
    }

    // ─── Rehash legacy SHA-256 passwords to scrypt on successful login ───
    if (!user.password.startsWith('scrypt$')) {
      const newHash = await hashPassword(password)
      await db.user.update({ where: { id: user.id }, data: { password: newHash } })
    }

    // ─── Normal login flow ───
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