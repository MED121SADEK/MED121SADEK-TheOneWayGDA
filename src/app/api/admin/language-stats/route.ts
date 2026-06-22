import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/admin/language-stats — Language distribution analytics for admin dashboard
 * Returns: preferred language distribution, proficient language counts, trends
 */

const LANG_META: Record<string, { label: string; flag: string }> = {
  en: { label: 'English', flag: '🇬🇧' },
  fr: { label: 'French', flag: '🇫🇷' },
  ar: { label: 'Arabic', flag: '🇸🇦' },
  es: { label: 'Spanish', flag: '🇪🇸' },
  de: { label: 'German', flag: '🇩🇪' },
  zh: { label: 'Chinese', flag: '🇨🇳' },
  ja: { label: 'Japanese', flag: '🇯🇵' },
  ko: { label: 'Korean', flag: '🇰🇷' },
  pt: { label: 'Portuguese', flag: '🇧🇷' },
  ru: { label: 'Russian', flag: '🇷🇺' },
  hi: { label: 'Hindi', flag: '🇮🇳' },
  tr: { label: 'Turkish', flag: '🇹🇷' },
}

function verifyAdmin(request: NextRequest): boolean {
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret) return false

  const cookieToken = request.cookies.get('oneway-admin-token')?.value
  if (cookieToken && cookieToken === adminSecret) return true

  const authHeader = request.headers.get('x-admin-token')
  if (authHeader && authHeader === adminSecret) return true

  return false
}

export async function GET(request: NextRequest) {
  try {
    if (!verifyAdmin(request)) {
      return NextResponse.json({ error: 'Admin password required' }, { status: 401 })
    }

    // 1. Preferred language distribution (all active users)
    const preferredLangRaw = await db.user.findMany({
      where: { role: { in: ['user', 'pro', 'admin'] } },
      select: { preferredLanguage: true },
    })

    const preferredLangCounts: Record<string, number> = {}
    for (const u of preferredLangRaw) {
      const lang = u.preferredLanguage || 'en'
      preferredLangCounts[lang] = (preferredLangCounts[lang] || 0) + 1
    }

    // 2. Proficient languages aggregate
    const proficientLangRaw = await db.user.findMany({
      where: {
        role: { in: ['user', 'pro', 'admin'] },
        proficientLanguages: { not: null },
      },
      select: { proficientLanguages: true },
    })

    const proficientLangCounts: Record<string, number> = {}
    for (const u of proficientLangRaw) {
      try {
        const langs: string[] = JSON.parse(u.proficientLanguages || '[]')
        for (const lang of langs) {
          if (typeof lang === 'string' && lang.length <= 5) {
            proficientLangCounts[lang] = (proficientLangCounts[lang] || 0) + 1
          }
        }
      } catch { /* skip malformed */ }
    }

    // 3. Pending users language distribution
    const pendingLangRaw = await db.user.findMany({
      where: { role: 'pending' },
      select: { preferredLanguage: true },
    })

    const pendingLangCounts: Record<string, number> = {}
    for (const u of pendingLangRaw) {
      const lang = u.preferredLanguage || 'en'
      pendingLangCounts[lang] = (pendingLangCounts[lang] || 0) + 1
    }

    // 4. Language distribution per month (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const recentUsers = await db.user.findMany({
      where: {
        role: { in: ['user', 'pro', 'admin'] },
        createdAt: { gte: sixMonthsAgo },
      },
      select: { preferredLanguage: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    const monthlyBreakdown: Record<string, Record<string, number>> = {}
    for (const u of recentUsers) {
      const monthKey = u.createdAt.toISOString().slice(0, 7) // "2025-06"
      const lang = u.preferredLanguage || 'en'
      if (!monthlyBreakdown[monthKey]) monthlyBreakdown[monthKey] = {}
      monthlyBreakdown[monthKey][lang] = (monthlyBreakdown[monthKey][lang] || 0) + 1
    }

    // 5. Total counts
    const totalActive = preferredLangRaw.length
    const totalPending = pendingLangRaw.length

    // 6. Multi-language users count (users with >1 proficient language)
    let multiLangCount = 0
    for (const u of proficientLangRaw) {
      try {
        const langs: string[] = JSON.parse(u.proficientLanguages || '[]')
        if (langs.length > 1) multiLangCount++
      } catch { /* skip */ }
    }

    return NextResponse.json({
      preferredLanguage: Object.entries(preferredLangCounts)
        .map(([code, count]) => ({
          code,
          label: LANG_META[code]?.label || code.toUpperCase(),
          flag: LANG_META[code]?.flag || '🌐',
          count,
          percentage: totalActive > 0 ? Math.round((count / totalActive) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count),

      proficientLanguages: Object.entries(proficientLangCounts)
        .map(([code, count]) => ({
          code,
          label: LANG_META[code]?.label || code.toUpperCase(),
          flag: LANG_META[code]?.flag || '🌐',
          count,
          percentage: totalActive > 0 ? Math.round((count / totalActive) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count),

      pendingLanguages: Object.entries(pendingLangCounts)
        .map(([code, count]) => ({
          code,
          label: LANG_META[code]?.label || code.toUpperCase(),
          flag: LANG_META[code]?.flag || '🌐',
          count,
          percentage: totalPending > 0 ? Math.round((count / totalPending) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count),

      monthlyBreakdown,
      summary: {
        totalActive,
        totalPending,
        multiLanguageUsers: multiLangCount,
        avgLanguagesPerUser: proficientLangRaw.length > 0
          ? Math.round((Object.values(proficientLangCounts).reduce((a, b) => a + b, 0) / proficientLangRaw.length) * 10) / 10
          : 0,
        uniqueLanguagesUsed: Object.keys(proficientLangCounts).length,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch language stats'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}