import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest } from '@/lib/auth'
import { apiRouteLogger } from '@/lib/api-logger'

const log = apiRouteLogger('/api/teams/[id]/members')

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

// Helper: check if user is a member of the team
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

const VALID_ROLES = ['owner', 'admin', 'member', 'viewer']

// GET /api/teams/[id]/members — List all members of a team
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

    const members = await db.teamMember.findMany({
      where: { teamId: id },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    })

    end(200)
    return NextResponse.json({ success: true, data: members })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ success: false, error: 'Failed to fetch team members' }, { status: 500 })
  }
}

// POST /api/teams/[id]/members — Add member by userId or invite code
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const end = log.start('POST')
  try {
    const session = await authenticate(request)
    if (!session) {
      end(401)
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params

    // Check membership — only owner/admin can add members
    const membership = await getTeamMembership(id, session.userId)
    if (!membership || !isOwnerOrAdmin(membership.role)) {
      end(403)
      return NextResponse.json({ success: false, error: 'Only owner or admin can add members' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, inviteCode } = body

    // Check max members limit
    const team = await db.team.findUnique({ where: { id } })
    if (!team) {
      end(404)
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 })
    }

    const currentMemberCount = await db.teamMember.count({ where: { teamId: id } })
    if (currentMemberCount >= team.maxMembers) {
      end(400)
      return NextResponse.json({ success: false, error: 'Team has reached maximum member limit' }, { status: 400 })
    }

    let targetUserId = userId

    // If invite code provided, look up the team by invite code and use that team's ID
    if (!targetUserId && inviteCode) {
      const invitedTeam = await db.team.findUnique({ where: { inviteCode } })
      if (!invitedTeam || invitedTeam.id !== id) {
        end(400)
        return NextResponse.json({ success: false, error: 'Invalid invite code for this team' }, { status: 400 })
      }
    }

    if (!targetUserId) {
      end(400)
      return NextResponse.json({ success: false, error: 'userId or inviteCode is required' }, { status: 400 })
    }

    // Verify target user exists
    const targetUser = await db.user.findUnique({ where: { id: targetUserId } })
    if (!targetUser) {
      end(404)
      return NextResponse.json({ success: false, error: 'Target user not found' }, { status: 404 })
    }

    // Check if already a member
    const existingMember = await getTeamMembership(id, targetUserId)
    if (existingMember) {
      end(409)
      return NextResponse.json({ success: false, error: 'User is already a team member' }, { status: 409 })
    }

    const newMember = await db.teamMember.create({
      data: {
        teamId: id,
        userId: targetUserId,
        role: 'member',
        nickname: targetUser.name || null,
      },
    })

    // Log activity
    await db.teamActivity.create({
      data: {
        teamId: id,
        userId: session.userId,
        userName: session.user.name || null,
        type: 'member_joined',
        details: JSON.stringify({ addedUserId: targetUserId, addedUserName: targetUser.name }),
      },
    })

    end(201)
    return NextResponse.json({ success: true, data: newMember }, { status: 201 })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ success: false, error: 'Failed to add team member' }, { status: 500 })
  }
}

// PATCH /api/teams/[id]/members — Update member role (owner/admin only)
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
      return NextResponse.json({ success: false, error: 'Only owner or admin can update member roles' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, role } = body

    if (!userId) {
      end(400)
      return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 })
    }
    if (!role || !VALID_ROLES.includes(role)) {
      end(400)
      return NextResponse.json({ success: false, error: `Role must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 })
    }

    // Can't change owner's role unless the current user is the owner
    const targetMembership = await getTeamMembership(id, userId)
    if (!targetMembership) {
      end(404)
      return NextResponse.json({ success: false, error: 'User is not a team member' }, { status: 404 })
    }

    if (targetMembership.role === 'owner') {
      end(403)
      return NextResponse.json({ success: false, error: 'Cannot change the owner\'s role' }, { status: 403 })
    }

    // Non-owners cannot assign the owner role
    if (role === 'owner' && membership.role !== 'owner') {
      end(403)
      return NextResponse.json({ success: false, error: 'Only the current owner can assign the owner role' }, { status: 403 })
    }

    // If assigning owner, transfer ownership
    if (role === 'owner') {
      await db.$transaction([
        db.teamMember.update({
          where: { teamId_userId: { teamId: id, userId: session.userId } },
          data: { role: 'admin' },
        }),
        db.teamMember.update({
          where: { teamId_userId: { teamId: id, userId } },
          data: { role: 'owner' },
        }),
        db.team.update({
          where: { id },
          data: { ownerId: userId },
        }),
      ])
    } else {
      await db.teamMember.update({
        where: { teamId_userId: { teamId: id, userId } },
        data: { role },
      })
    }

    const updatedMember = await db.teamMember.findUnique({
      where: { teamId_userId: { teamId: id, userId } },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    })

    // Log activity
    await db.teamActivity.create({
      data: {
        teamId: id,
        userId: session.userId,
        userName: session.user.name || null,
        type: 'team_updated',
        details: JSON.stringify({
          action: 'role_changed',
          targetUserId: userId,
          oldRole: targetMembership.role,
          newRole: role,
        }),
      },
    })

    end(200)
    return NextResponse.json({ success: true, data: updatedMember })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ success: false, error: 'Failed to update member role' }, { status: 500 })
  }
}

// DELETE /api/teams/[id]/members — Remove member from team
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
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      end(400)
      return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 })
    }

    // Check the target membership
    const targetMembership = await getTeamMembership(id, userId)
    if (!targetMembership) {
      end(404)
      return NextResponse.json({ success: false, error: 'User is not a team member' }, { status: 404 })
    }

    // Check permission: can remove self, or owner/admin can remove others
    const isSelf = session.userId === userId
    const isRemovingOthers = session.userId !== userId

    if (isRemovingOthers) {
      const membership = await getTeamMembership(id, session.userId)
      if (!membership || !isOwnerOrAdmin(membership.role)) {
        end(403)
        return NextResponse.json({ success: false, error: 'Only owner or admin can remove other members' }, { status: 403 })
      }
      // Cannot remove the owner
      if (targetMembership.role === 'owner') {
        end(403)
        return NextResponse.json({ success: false, error: 'Cannot remove the team owner' }, { status: 403 })
      }
    }

    // If removing self and is owner, prevent it (must transfer ownership first)
    if (isSelf && targetMembership.role === 'owner') {
      end(400)
      return NextResponse.json({ success: false, error: 'Owner must transfer ownership before leaving' }, { status: 400 })
    }

    // Get user info for activity log before deletion
    const targetUser = await db.user.findUnique({
      where: { id: userId },
      select: { name: true },
    })

    await db.teamMember.delete({
      where: { teamId_userId: { teamId: id, userId } },
    })

    // Log activity
    await db.teamActivity.create({
      data: {
        teamId: id,
        userId: session.userId,
        userName: session.user.name || null,
        type: 'member_left',
        details: JSON.stringify({
          removedUserId: userId,
          removedUserName: targetUser?.name,
          selfRemoved: isSelf,
        }),
      },
    })

    end(200)
    return NextResponse.json({ success: true, data: { message: 'Member removed successfully' } })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ success: false, error: 'Failed to remove team member' }, { status: 500 })
  }
}
