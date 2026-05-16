import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest } from '@/lib/auth'
import { apiRouteLogger } from '@/lib/api-logger'

const log = apiRouteLogger('/api/teams/[id]')

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

// Helper: check if user is a member of the team and return the membership
async function getTeamMembership(teamId: string, userId: string) {
  return db.teamMember.findUnique({
    where: {
      teamId_userId: { teamId, userId },
    },
  })
}

// Helper: check if user has owner or admin role
function isOwnerOrAdmin(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'admin'
}

// GET /api/teams/[id] — Get team by ID with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const end = log.start('GET')
  try {
    const session = await authenticate(request)
    if (!session) {
      end(401)
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params

    // Check membership
    const membership = await getTeamMembership(id, session.userId)
    if (!membership) {
      end(403)
      return NextResponse.json({ success: false, error: 'Not a team member' }, { status: 403 })
    }

    const team = await db.team.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, email: true, image: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, image: true },
            },
          },
          orderBy: { joinedAt: 'asc' },
        },
      },
    })

    if (!team) {
      end(404)
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 })
    }

    const [inviteCount, shareCount, activityCount] = await Promise.all([
      db.teamInvite.count({ where: { teamId: id, status: 'pending' } }),
      db.teamShare.count({ where: { teamId: id } }),
      db.teamActivity.count({ where: { teamId: id } }),
    ])

    end(200)
    return NextResponse.json({
      success: true,
      data: {
        ...team,
        inviteCount,
        shareCount,
        activityCount,
      },
    })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ success: false, error: 'Failed to fetch team' }, { status: 500 })
  }
}

// PATCH /api/teams/[id] — Update team (owner/admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const end = log.start('PATCH')
  try {
    const session = await authenticate(request)
    if (!session) {
      end(401)
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params

    // Check membership and role
    const membership = await getTeamMembership(id, session.userId)
    if (!membership || !isOwnerOrAdmin(membership.role)) {
      end(403)
      return NextResponse.json({ success: false, error: 'Only owner or admin can update team' }, { status: 403 })
    }

    const team = await db.team.findUnique({ where: { id } })
    if (!team) {
      end(404)
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, description, avatar, isPublic, maxMembers, settings } = body

    // Build update data
    const updateData: Record<string, unknown> = {}
    if (name !== undefined) {
      if (!name?.trim()) {
        end(400)
        return NextResponse.json({ success: false, error: 'Team name cannot be empty' }, { status: 400 })
      }
      updateData.name = name.trim()
    }
    if (description !== undefined) updateData.description = description?.trim() || null
    if (avatar !== undefined) updateData.avatar = avatar || null
    if (isPublic !== undefined) updateData.isPublic = Boolean(isPublic)
    if (maxMembers !== undefined) {
      const max = Number(maxMembers)
      if (isNaN(max) || max < 1 || max > 1000) {
        end(400)
        return NextResponse.json({ success: false, error: 'maxMembers must be between 1 and 1000' }, { status: 400 })
      }
      updateData.maxMembers = max
    }
    if (settings !== undefined) updateData.settings = typeof settings === 'string' ? settings : JSON.stringify(settings)

    const updatedTeam = await db.team.update({
      where: { id },
      data: updateData,
    })

    // Log activity
    await db.teamActivity.create({
      data: {
        teamId: id,
        userId: session.userId,
        userName: session.user.name || null,
        type: 'team_updated',
        details: JSON.stringify({ changed: Object.keys(updateData) }),
      },
    })

    end(200)
    return NextResponse.json({ success: true, data: updatedTeam })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ success: false, error: 'Failed to update team' }, { status: 500 })
  }
}

// DELETE /api/teams/[id] — Delete team (owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const end = log.start('DELETE')
  try {
    const session = await authenticate(request)
    if (!session) {
      end(401)
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params

    // Check membership and role
    const membership = await getTeamMembership(id, session.userId)
    if (!membership || membership.role !== 'owner') {
      end(403)
      return NextResponse.json({ success: false, error: 'Only the team owner can delete the team' }, { status: 403 })
    }

    const team = await db.team.findUnique({ where: { id } })
    if (!team) {
      end(404)
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 })
    }

    // Log activity before deletion
    await db.teamActivity.create({
      data: {
        teamId: id,
        userId: session.userId,
        userName: session.user.name || null,
        type: 'team_updated',
        details: JSON.stringify({ action: 'deleted', teamName: team.name }),
      },
    })

    // Delete team (cascading will handle members, invites, shares, activity, comments)
    await db.team.delete({ where: { id } })

    end(200)
    return NextResponse.json({ success: true, data: { message: 'Team deleted successfully' } })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ success: false, error: 'Failed to delete team' }, { status: 500 })
  }
}
