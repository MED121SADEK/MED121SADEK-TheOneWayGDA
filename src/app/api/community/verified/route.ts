import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ─── GET /api/community/verified ───
// Returns all active verified researchers (public endpoint)
// Also supports ?email=xxx to check a single author
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (email) {
      // Check if a specific author is verified
      const researcher = await db.verifiedResearcher.findUnique({
        where: { email: email.toLowerCase() },
      })
      return NextResponse.json({ verified: !!researcher, researcher: researcher || null })
    }

    // Return all active verified researchers
    const researchers = await db.verifiedResearcher.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      select: {
        email: true,
        displayName: true,
        institution: true,
        role: true,
        badgeType: true,
        bio: true,
        websiteUrl: true,
      },
    })
    return NextResponse.json({ researchers })
  } catch (error) {
    console.error('Verified researchers fetch error:', error)
    return NextResponse.json({ error: 'Failed to load verified researchers' }, { status: 500 })
  }
}

// ─── POST /api/community/verified ───
// Add a new verified researcher (admin action)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, displayName, institution, role, badgeType, bio, websiteUrl, verifiedBy } = body

    if (!email?.trim() || !displayName?.trim()) {
      return NextResponse.json({ error: 'Email and display name are required.' }, { status: 400 })
    }

    const researcher = await db.verifiedResearcher.upsert({
      where: { email: email.trim().toLowerCase() },
      update: {
        displayName: displayName.trim(),
        institution: institution?.trim() || null,
        role: role?.trim() || null,
        badgeType: badgeType || 'verified',
        bio: bio?.trim() || null,
        websiteUrl: websiteUrl?.trim() || null,
        verifiedBy: verifiedBy?.trim() || null,
        isActive: true,
      },
      create: {
        email: email.trim().toLowerCase(),
        displayName: displayName.trim(),
        institution: institution?.trim() || null,
        role: role?.trim() || null,
        badgeType: badgeType || 'verified',
        bio: bio?.trim() || null,
        websiteUrl: websiteUrl?.trim() || null,
        verifiedBy: verifiedBy?.trim() || null,
      },
    })

    return NextResponse.json({ researcher, success: true })
  } catch (error) {
    console.error('Verified researcher create error:', error)
    return NextResponse.json({ error: 'Failed to add verified researcher' }, { status: 500 })
  }
}

// ─── DELETE /api/community/verified ───
// Remove verified status from a researcher (admin action)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    }

    await db.verifiedResearcher.delete({
      where: { email: email.toLowerCase() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Verified researcher delete error:', error)
    return NextResponse.json({ error: 'Failed to remove verified researcher' }, { status: 500 })
  }
}
