import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 5
const RATE_WINDOW = 60_000

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return false
  }
  entry.count++
  return entry.count > RATE_LIMIT
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

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip') || 'unknown'

    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
    }

    const body = await request.json()
    const { email, name } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email address is required.' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    if (!isValidEmail(normalizedEmail)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }
    if (normalizedEmail.length > 254) {
      return NextResponse.json({ error: 'Email address is too long.' }, { status: 400 })
    }
    if (isDisposable(normalizedEmail)) {
      return NextResponse.json({ error: 'Disposable email addresses are not accepted.' }, { status: 400 })
    }

    const userAgent = request.headers.get('user-agent') || null
    const path = request.headers.get('referer') || null

    // Single upsert instead of findFirst + create/update (2 queries → 1)
    const result = await db.visitor.upsert({
      where: { email: normalizedEmail },
      update: { name: name?.trim(), ipAddress: ip !== 'unknown' ? ip : undefined, userAgent, path, lastSeen: new Date() },
      create: { email: normalizedEmail, name: name?.trim() || null, ipAddress: ip !== 'unknown' ? ip : null, userAgent, path },
    })

    return NextResponse.json({ success: true, message: 'Welcome to TheOneWayGDA!', isNew: result.createdAt === result.updatedAt })
  } catch (error) {
    console.error('Visitor registration error:', error)
    return NextResponse.json({ error: 'An internal error occurred.' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const totalVisitors = await db.visitor.count()
    const recentVisitors = await db.visitor.count({ where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } })
    return NextResponse.json({ totalVisitors, recentVisitors })
  } catch {
    return NextResponse.json({ totalVisitors: 0, recentVisitors: 0 })
  }
}
