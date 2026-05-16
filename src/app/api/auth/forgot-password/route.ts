import { NextRequest, NextResponse } from 'next/server'
import { generateToken } from '@/lib/auth'
import { db } from '@/lib/db'
import { sendPasswordResetEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Always return success to prevent email enumeration attacks
    const user = await db.user.findUnique({ where: { email: normalizedEmail } })

    if (!user) {
      return NextResponse.json({
        message: 'If an account exists with this email, you will receive a password reset link shortly.',
      })
    }

    // Don't allow password reset for pending/rejected users
    if (user.role === 'pending' || user.role === 'rejected') {
      return NextResponse.json({
        message: 'If an account exists with this email, you will receive a password reset link shortly.',
      })
    }

    // Generate reset token (1 hour expiry)
    const resetToken = generateToken()
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await db.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    })

    // Send reset email (fire-and-forget)
    const userName = user.name || user.email.split('@')[0]
    sendPasswordResetEmail(user.email, userName, resetToken).catch(() => {})

    return NextResponse.json({
      message: 'If an account exists with this email, you will receive a password reset link shortly.',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process request'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
