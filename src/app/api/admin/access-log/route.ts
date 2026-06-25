import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ── Admin auth (same pattern as other admin routes) ──────────────────────
function verifyAdmin(request: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret) return false
  const cookieToken = request.cookies.get('oneway-admin-token')?.value
  if (cookieToken && cookieToken === adminSecret) return true
  const authHeader = request.headers.get('x-admin-token')
  if (authHeader && authHeader === adminSecret) return true
  return false
}

// ── Country detection from CDN headers ───────────────────────────────────
function detectCountry(request: NextRequest): string | null {
  return request.headers.get('cf-ipcountry') || request.headers.get('x-vercel-ip-country') || null
}

function getIp(request: NextRequest): string | null {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null
  )
}

// ── GET /api/admin/access-log — Admin: query access logs ─────────────────
export async function GET(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Admin password required' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))
    const search = searchParams.get('search')?.trim() || ''
    const country = searchParams.get('country')?.trim() || ''
    const path = searchParams.get('path')?.trim() || ''
    const fromDate = searchParams.get('from') || ''
    const toDate = searchParams.get('to') || ''

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { email: { contains: search } },
        { name: { contains: search } },
        { ipAddress: { contains: search } },
      ]
    }
    if (country) where.country = country
    if (path) where.path = { contains: path }
    if (fromDate || toDate) {
      const dateFilter: Record<string, unknown> = {}
      if (fromDate) dateFilter.gte = new Date(fromDate)
      if (toDate) dateFilter.lte = new Date(toDate + 'T23:59:59.999Z')
      where.createdAt = dateFilter
    }

    const [logs, total] = await Promise.all([
      db.accessLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.accessLog.count({ where }),
    ])

    // Also get unique visitors count and top paths/pages for summary
    const [uniqueVisitors, topPaths, topCountries] = await Promise.all([
      // Distinct email count (visitors who have logs)
      db.accessLog.groupBy({ by: ['email'], where: { email: { not: null } } })
        .then(r => r.length),
      // Top 10 most visited paths
      db.accessLog.groupBy({ by: ['path'], _count: { id: true } })
        .then(r => r.sort((a, b) => b._count.id - a._count.id).slice(0, 10)),
      // Top 10 countries
      db.accessLog.groupBy({ by: ['country'], where: { country: { not: null } }, _count: { id: true } })
        .then(r => r.sort((a, b) => b._count.id - a._count.id).slice(0, 10)),
    ])

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      summary: {
        totalLogs: total,
        uniqueVisitors,
        topPaths: topPaths.map(p => ({ path: p.path, count: p._count.id })),
        topCountries: topCountries.map(c => ({ country: c.country, count: c._count.id })),
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch access logs'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ── POST /api/admin/access-log — Internal: record a page visit ───────────
// This is called by a client-side hook or middleware to log page visits.
// Not strictly admin-only — but the recording endpoint is lightweight.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, name, pagePath, referrer, language } = body

    if (!pagePath || typeof pagePath !== 'string') {
      return NextResponse.json({ error: 'pagePath is required' }, { status: 400 })
    }

    const log = await db.accessLog.create({
      data: {
        email: email || null,
        name: name || null,
        path: pagePath,
        method: 'GET',
        userAgent: request.headers.get('user-agent') || null,
        ipAddress: getIp(request),
        country: detectCountry(request) || null,
        language: language || null,
        referrer: referrer || null,
      },
    })

    return NextResponse.json({ ok: true, id: log.id })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to log access'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ── PATCH /api/admin/access-log — Update duration when user leaves ───────
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, duration } = body

    if (!id || typeof duration !== 'number') {
      return NextResponse.json({ error: 'id and duration (seconds) required' }, { status: 400 })
    }

    await db.accessLog.update({
      where: { id },
      data: { duration: Math.round(duration) },
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true }) // silently fail — non-critical
  }
}

// ── DELETE /api/admin/access-log — Admin: purge old logs ─────────────────
export async function DELETE(request: NextRequest) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Admin password required' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const before = searchParams.get('before')

    const where: Record<string, unknown> = {}
    if (before) {
      where.createdAt = { lt: new Date(before) }
    }

    const result = await db.accessLog.deleteMany({ where })

    return NextResponse.json({ deleted: result.count })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete logs'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}