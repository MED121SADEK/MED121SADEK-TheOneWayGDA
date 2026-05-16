import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 })
    }

    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Find user with valid reset token
    const user = await db.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gte: new Date() },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired reset token. Please request a new password reset link.' }, { status: 400 })
    }

    // Update password and clear reset token
    const hashedPassword = hashPassword(password)
    await db.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    })

    return NextResponse.json({ message: 'Password has been reset successfully. You can now sign in with your new password.' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to reset password'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
