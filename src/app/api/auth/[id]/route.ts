import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        image: true,
        role: true,
        bio: true,
        company: true,
        location: true,
        website: true,
        skills: true,
        isOnboarded: true,
        createdAt: true,
        lastSeen: true,
        _count: { select: { activities: true } },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch user'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const token = getTokenFromRequest(request)

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const session = await db.userSession.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!session || (session.userId !== id && session.user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { name, bio, company, location, website, skills, preferences } = body

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (bio !== undefined) updateData.bio = bio
    if (company !== undefined) updateData.company = company
    if (location !== undefined) updateData.location = location
    if (website !== undefined) updateData.website = website
    if (skills !== undefined) updateData.skills = typeof skills === 'string' ? skills : JSON.stringify(skills)
    if (preferences !== undefined) updateData.preferences = typeof preferences === 'string' ? preferences : JSON.stringify(preferences)

    const user = await db.user.update({
      where: { id },
      data: updateData,
    })

    await db.userActivity.create({
      data: {
        userId: id,
        type: 'profile_updated',
        details: JSON.stringify({ fields: Object.keys(updateData) }),
        ipAddress: request.headers.get('x-forwarded-for') || null,
      },
    })

    const { password: _pw, ...safeUser } = user

    return NextResponse.json({ user: safeUser, message: 'Profile updated' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Update failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
