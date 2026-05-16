import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest } from '@/lib/auth'
import { apiRouteLogger } from '@/lib/api-logger'
import { randomBytes } from 'crypto'

const log = apiRouteLogger('/api/teams')

// Helper: authenticate and return user session
async function authenticate(request: NextRequest) {
  const token = getTokenFromRequest(request)
  if (!token) return null

  const session = await db.userSession.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!session || session.expiresAt < new Date()) {
    if (session) await db.userSession.delete({ where: { id: session.id } })
    return null
  }

  return session
}

// Helper: generate unique slug from name
async function generateUniqueSlug(name: string): Promise<string> {
  let base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  if (!base) base = 'team'

  let slug = base
  let counter = 1
  while (await db.team.findUnique({ where: { slug } })) {
    slug = `${base}-${counter}`
    counter++
  }
  return slug
}

// GET /api/teams — List teams for the current user
export async function GET(request: NextRequest) {
  const end = log.start('GET')
  try {
    const session = await authenticate(request)
    if (!session) {
      end(401)
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    // Find all team memberships for this user
    const memberships = await db.teamMember.findMany({
      where: { userId: session.userId },
      select: { teamId: true },
    })

    const teamIds = memberships.map(m => m.teamId)

    if (teamIds.length === 0) {
      end(200)
      return NextResponse.json({ success: true, data: [] })
    }

    const where: Record<string, unknown> = {
      id: { in: teamIds },
    }
    if (search) {
      where.name = { contains: search }
    }

    const teams = await db.team.findMany({
      where,
      include: {
        members: {
          select: { id: true },
        },
        owner: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const teamsWithCounts = teams.map(team => ({
      ...team,
      memberCount: team.members.length,
      members: undefined,
    }))

    end(200)
    return NextResponse.json({ success: true, data: teamsWithCounts })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ success: false, error: 'Failed to fetch teams' }, { status: 500 })
  }
}

// POST /api/teams — Create a new team
export async function POST(request: NextRequest) {
  const end = log.start('POST')
  try {
    const session = await authenticate(request)
    if (!session) {
      end(401)
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, avatar, isPublic, maxMembers } = body

    if (!name?.trim()) {
      end(400)
      return NextResponse.json({ success: false, error: 'Team name is required' }, { status: 400 })
    }

    if (name.trim().length > 100) {
      end(400)
      return NextResponse.json({ success: false, error: 'Team name is too long (max 100 chars)' }, { status: 400 })
    }

    const slug = await generateUniqueSlug(name.trim())
    const inviteCode = randomBytes(4).toString('hex')

    const team = await db.team.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        slug,
        avatar: avatar || null,
        ownerId: session.userId,
        isPublic: isPublic ?? false,
        maxMembers: maxMembers ?? 10,
        inviteCode,
      },
    })

    // Add creator as owner member
    await db.teamMember.create({
      data: {
        teamId: team.id,
        userId: session.userId,
        role: 'owner',
        nickname: session.user.name || null,
      },
    })

    // Log activity
    await db.teamActivity.create({
      data: {
        teamId: team.id,
        userId: session.userId,
        userName: session.user.name || null,
        type: 'team_updated',
        details: JSON.stringify({ action: 'created', teamName: team.name }),
      },
    })

    end(201)
    return NextResponse.json({ success: true, data: team }, { status: 201 })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ success: false, error: 'Failed to create team' }, { status: 500 })
  }
}
