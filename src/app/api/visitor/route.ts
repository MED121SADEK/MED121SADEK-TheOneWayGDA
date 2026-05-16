import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendVisitorNotification } from '@/lib/email'

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 5
const RATE_WINDOW = 60_000

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) { rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW }); return false }
  entry.count++; return entry.count > RATE_LIMIT
}

function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email)
}

const DISPOSABLE_DOMAINS = [
  'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
  'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com', 'grr.la',
  'dispostable.com', 'trashmail.com', '10minutemail.com', 'tempinbox.com',
]

function isDisposable(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  return domain ? DISPOSABLE_DOMAINS.some(d => domain === d || domain.endsWith('.' + d)) : false
}

const VALID_TYPES = ['researcher', 'student', 'professional', 'enterprise', 'developer', 'educator', 'general']

function detectCountry(request: NextRequest): string | null {
  return request.headers.get('cf-ipcountry') || request.headers.get('x-vercel-ip-country') || null
}

function detectLanguage(acceptLanguage: string | null): string | null {
  if (!acceptLanguage) return null
  const primary = acceptLanguage.split(',')[0]?.split('-')[0]?.trim()
  const langMap: Record<string, string> = {
    en: 'English', ar: 'Arabic', fr: 'French', es: 'Spanish',
    de: 'German', zh: 'Chinese', ja: 'Japanese', ko: 'Korean',
  }
  return primary ? (langMap[primary] || primary.toUpperCase()) : null
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip') || 'unknown'
    if (isRateLimited(ip)) return NextResponse.json({ error: 'Too many requests.' }, { status: 429 })

    const body = await request.json()
    const { email, name, visitorType } = body

    if (!email || typeof email !== 'string') return NextResponse.json({ error: 'Email address is required.' }, { status: 400 })
    const normalizedEmail = email.trim().toLowerCase()

    if (!isValidEmail(normalizedEmail)) return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    if (isDisposable(normalizedEmail)) return NextResponse.json({ error: 'Disposable email addresses are not accepted.' }, { status: 400 })

    const validatedType = VALID_TYPES.includes(visitorType) ? visitorType : 'general'
    const userAgent = request.headers.get('user-agent') || null
    const path = request.headers.get('referer') || null
    const country = detectCountry(request)
    const language = detectLanguage(request.headers.get('accept-language'))

    const result = await db.visitor.upsert({
      where: { email: normalizedEmail },
      update: { name: name?.trim(), visitorType: validatedType, ipAddress: ip !== 'unknown' ? ip : undefined, userAgent, path, country, language, lastSeen: new Date() },
      create: { email: normalizedEmail, name: name?.trim() || null, visitorType: validatedType, ipAddress: ip !== 'unknown' ? ip : null, userAgent, path, country, language },
    })

    const isNew = result.createdAt.getTime() === result.lastSeen.getTime()
    if (isNew) {
      sendVisitorNotification({ name: name?.trim() || null, email: normalizedEmail, visitorType: validatedType, country, language, ipAddress: ip !== 'unknown' ? ip : null, userAgent, path }).catch(() => {})
    }

    return NextResponse.json({ success: true, message: 'Registration submitted successfully!', isNew, status: result.status })
  } catch (error) {
    console.error('Visitor registration error:', error)
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    // If email is provided, return that visitor's status
    if (email) {
      const normalizedEmail = email.trim().toLowerCase()
      if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
        return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
      }

      // Auto-accept users who have an active User account (admin/FOUNDER/pro/user)
      const existingUser = await db.user.findUnique({ where: { email: normalizedEmail } })
      if (existingUser && existingUser.role !== 'pending' && existingUser.role !== 'rejected') {
        // Also update visitor status if it exists
        try {
          await db.visitor.update({
            where: { email: normalizedEmail },
            data: { status: 'accepted' },
          })
        } catch { /* visitor may not exist */ }
        return NextResponse.json({
          status: 'accepted',
          visitorType: 'professional',
          name: existingUser.name || normalizedEmail.split('@')[0],
          createdAt: existingUser.createdAt,
        })
      }

      const visitor = await db.visitor.findUnique({ where: { email: normalizedEmail } })
      if (!visitor) {
        return NextResponse.json({ status: 'unknown' })
      }
      return NextResponse.json({
        status: visitor.status,
        visitorType: visitor.visitorType,
        name: visitor.name,
        createdAt: visitor.createdAt,
      })
    }

    // Otherwise return aggregate stats
    const totalVisitors = await db.visitor.count()
    const recentVisitors = await db.visitor.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } })
    const pendingCount = await db.visitor.count({ where: { status: 'pending' } })
    return NextResponse.json({ totalVisitors, recentVisitors, pendingCount })
  } catch { return NextResponse.json({ totalVisitors: 0, recentVisitors: 0, pendingCount: 0 }) }
}
