import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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

/**
 * GET /api/community/user-languages?email=...
 *
 * Public endpoint — returns language preferences for a user by email.
 * Used by the community profile page to display language badges.
 * Only returns non-sensitive language data (not email, name, role, etc.).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: 'Email parameter is required' }, { status: 400 })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        preferredLanguage: true,
        proficientLanguages: true,
      },
    })

    if (!user) {
      return NextResponse.json({ preferredLanguage: null, proficientLanguages: [] })
    }

    // Parse proficient languages from JSON string
    let proficientCodes: string[] = []
    try {
      const parsed = JSON.parse(user.proficientLanguages || '[]')
      if (Array.isArray(parsed)) {
        proficientCodes = parsed.filter((l: unknown) => typeof l === 'string' && l.length <= 5)
      }
    } catch { /* ignore malformed */ }

    // Build response with human-readable labels and flags
    const primaryCode = user.preferredLanguage || 'en'
    const primary = LANG_META[primaryCode] || { label: primaryCode.toUpperCase(), flag: '🌐' }

    const proficient = proficientCodes.map(code => ({
      code,
      label: LANG_META[code]?.label || code.toUpperCase(),
      flag: LANG_META[code]?.flag || '🌐',
      isPrimary: code === primaryCode,
    }))

    return NextResponse.json({
      preferredLanguage: {
        code: primaryCode,
        ...primary,
      },
      proficientLanguages: proficient,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch language data'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}