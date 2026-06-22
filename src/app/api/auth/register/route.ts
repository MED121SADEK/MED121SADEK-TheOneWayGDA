import { NextRequest, NextResponse } from 'next/server'
import { hashPassword } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const { email, name, password, languages } = await request.json()

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

    // Determine primary language from selection (first chosen, fallback 'en')
    const validLangs = Array.isArray(languages) && languages.length > 0
      ? languages.filter((l: string) => typeof l === 'string' && l.length <= 5)
      : []
    const primaryLang = validLangs.length > 0 ? validLangs[0] : 'en'
    const allLangs = validLangs.length > 0 ? validLangs : [primaryLang]

    // Validate language codes against allowed list to prevent injection
    const ALLOWED_LANG_CODES = ['en','fr','ar','es','de','zh','ja','ko','pt','ru','hi','tr']
    const sanitizedLangs = allLangs.filter((l: string) => ALLOWED_LANG_CODES.includes(l))
    const safePrimary = ALLOWED_LANG_CODES.includes(primaryLang) ? primaryLang : 'en'

    // Create user with 'pending' role — requires admin approval before access
    const user = await db.user.create({
      data: {
        email: normalizedEmail,
        name: name?.trim() || null,
        password: await hashPassword(password),
        role: 'pending',
        preferredLanguage: safePrimary,
        proficientLanguages: JSON.stringify(sanitizedLangs),
        preferences: JSON.stringify({
          theme: 'dark',
          language: safePrimary,
          languages: sanitizedLangs,
          notifications: true,
          aiSensitivity: 0.7,
        }),
      },
    })

    await db.userActivity.create({
      data: {
        userId: user.id,
        type: 'registration_pending',
        details: JSON.stringify({ method: 'register', name: name?.trim() || null, languages: sanitizedLangs, primaryLanguage: safePrimary }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      },
    })

    await db.visitor.upsert({
      where: { email: normalizedEmail },
      update: { name: user.name, status: 'pending', language: safePrimary },
      create: { email: normalizedEmail, name: user.name, status: 'pending', language: safePrimary },
    })

    // Notify admin about new access request
    try {
      const { sendAdminAccessRequestEmail } = await import('@/lib/email')
      await sendAdminAccessRequestEmail(user.name, normalizedEmail, user.id, sanitizedLangs.join(', '))
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