import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest } from '@/lib/auth'
import { apiRouteLogger } from '@/lib/api-logger'

const log = apiRouteLogger('/api/teams/join')

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

// POST /api/teams/join — Join a team by invite code
export async function POST(request: NextRequest) {
  const end = log.start('POST')
  try {
    const session = await authenticate(request)
    if (!session) {
      end(401)
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { inviteCode } = body

    if (!inviteCode?.trim()) {
      end(400)
      return NextResponse.json({ success: false, error: 'Invite code is required' }, { status: 400 })
    }

    // Look up team by invite code
    const team = await db.team.findUnique({
      where: { inviteCode: inviteCode.trim() },
    })

    if (!team) {
      end(404)
      return NextResponse.json({ success: false, error: 'Invalid invite code' }, { status: 404 })
    }

    // Check if already a member
    const existingMember = await db.teamMember.findUnique({
      where: {
        teamId_userId: { teamId: team.id, userId: session.userId },
      },
    })

    if (existingMember) {
      end(409)
      return NextResponse.json({ success: false, error: 'You are already a member of this team' }, { status: 409 })
    }

    // Check max members
    const currentCount = await db.teamMember.count({ where: { teamId: team.id } })
    if (currentCount >= team.maxMembers) {
      end(400)
      return NextResponse.json({ success: false, error: 'Team has reached maximum member limit' }, { status: 400 })
    }

    // Get default role from team settings if available
    let defaultRole = 'member'
    if (team.settings) {
      try {
        const settings = typeof team.settings === 'string'
          ? JSON.parse(team.settings)
          : team.settings
        if (settings.defaultRole && ['member', 'viewer'].includes(settings.defaultRole)) {
          defaultRole = settings.defaultRole
        }
      } catch {
        // Use default role
      }
    }

    // Add user as team member
    const newMember = await db.teamMember.create({
      data: {
        teamId: team.id,
        userId: session.userId,
        role: defaultRole,
        nickname: session.user.name || null,
      },
    })

    // Log activity
    await db.teamActivity.create({
      data: {
        teamId: team.id,
        userId: session.userId,
        userName: session.user.name || null,
        type: 'member_joined',
        details: JSON.stringify({ method: 'invite_code', role: defaultRole }),
      },
    })

    end(201)
    return NextResponse.json({
      success: true,
      data: {
        member: newMember,
        team: {
          id: team.id,
          name: team.name,
          slug: team.slug,
          avatar: team.avatar,
        },
      },
    }, { status: 201 })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ success: false, error: 'Failed to join team' }, { status: 500 })
  }
}
