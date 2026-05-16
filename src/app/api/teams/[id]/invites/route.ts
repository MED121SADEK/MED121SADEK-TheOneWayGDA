import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest } from '@/lib/auth'
import { apiRouteLogger } from '@/lib/api-logger'

const log = apiRouteLogger('/api/teams/[id]/invites')

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

// GET /api/teams/[id]/invites — List pending invites for a team
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
    if (!membership || !isOwnerOrAdmin(membership.role)) {
      end(403)
      return NextResponse.json({ success: false, error: 'Only owner or admin can view invites' }, { status: 403 })
    }

    const invites = await db.teamInvite.findMany({
      where: { teamId: id, status: 'pending' },
      orderBy: { createdAt: 'desc' },
    })

    end(200)
    return NextResponse.json({ success: true, data: invites })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ success: false, error: 'Failed to fetch invites' }, { status: 500 })
  }
}

// POST /api/teams/[id]/invites — Create an invite
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

    // Check membership and role
    const membership = await getTeamMembership(id, session.userId)
    if (!membership || !isOwnerOrAdmin(membership.role)) {
      end(403)
      return NextResponse.json({ success: false, error: 'Only owner or admin can send invites' }, { status: 403 })
    }

    const body = await request.json()
    const { email, userId, role, message } = body

    if (!email && !userId) {
      end(400)
      return NextResponse.json({ success: false, error: 'email or userId is required' }, { status: 400 })
    }

    const validRoles = ['owner', 'admin', 'member', 'viewer']
    const assignedRole = role || 'member'
    if (!validRoles.includes(assignedRole)) {
      end(400)
      return NextResponse.json({ success: false, error: `Role must be one of: ${validRoles.join(', ')}` }, { status: 400 })
    }

    // Verify team exists
    const team = await db.team.findUnique({ where: { id } })
    if (!team) {
      end(404)
      return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 })
    }

    // If userId provided, verify the user exists and isn't already a member
    if (userId) {
      const targetUser = await db.user.findUnique({ where: { id: userId } })
      if (!targetUser) {
        end(404)
        return NextResponse.json({ success: false, error: 'Target user not found' }, { status: 404 })
      }
      const existingMember = await getTeamMembership(id, userId)
      if (existingMember) {
        end(409)
        return NextResponse.json({ success: false, error: 'User is already a team member' }, { status: 409 })
      }
    }

    // Calculate expiry (7 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invite = await db.teamInvite.create({
      data: {
        teamId: id,
        invitedBy: session.userId,
        email: email?.trim().toLowerCase() || null,
        userId: userId || null,
        role: assignedRole,
        message: message?.trim() || null,
        expiresAt,
      },
    })

    // Log activity
    await db.teamActivity.create({
      data: {
        teamId: id,
        userId: session.userId,
        userName: session.user.name || null,
        type: 'invite_sent',
        details: JSON.stringify({
          inviteId: invite.id,
          target: email || userId,
          role: assignedRole,
        }),
      },
    })

    end(201)
    return NextResponse.json({ success: true, data: invite }, { status: 201 })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ success: false, error: 'Failed to create invite' }, { status: 500 })
  }
}

// PATCH /api/teams/[id]/invites — Respond to an invite (accept/reject)
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
    const body = await request.json()
    const { inviteId, action } = body

    if (!inviteId) {
      end(400)
      return NextResponse.json({ success: false, error: 'inviteId is required' }, { status: 400 })
    }

    if (!action || !['accept', 'reject'].includes(action)) {
      end(400)
      return NextResponse.json({ success: false, error: 'action must be "accept" or "reject"' }, { status: 400 })
    }

    // Find the invite
    const invite = await db.teamInvite.findUnique({ where: { id: inviteId } })
    if (!invite) {
      end(404)
      return NextResponse.json({ success: false, error: 'Invite not found' }, { status: 404 })
    }

    // Verify the invite belongs to this team
    if (invite.teamId !== id) {
      end(404)
      return NextResponse.json({ success: false, error: 'Invite not found for this team' }, { status: 404 })
    }

    // Verify the invite is for the current user (either by userId or email)
    const isInviteForMe = invite.userId === session.userId || invite.email === session.user.email?.toLowerCase()
    if (!isInviteForMe && !isOwnerOrAdmin(
      (await getTeamMembership(id, session.userId))?.role
    )) {
      end(403)
      return NextResponse.json({ success: false, error: 'This invite is not for you' }, { status: 403 })
    }

    // Check invite hasn't already been responded to
    if (invite.status !== 'pending') {
      end(400)
      return NextResponse.json({ success: false, error: 'Invite has already been responded to' }, { status: 400 })
    }

    // Check invite hasn't expired
    if (invite.expiresAt < new Date()) {
      await db.teamInvite.update({
        where: { id: inviteId },
        data: { status: 'expired' },
      })
      end(400)
      return NextResponse.json({ success: false, error: 'Invite has expired' }, { status: 400 })
    }

    const newStatus = action === 'accept' ? 'accepted' : 'rejected'

    await db.teamInvite.update({
      where: { id: inviteId },
      data: { status: newStatus, respondedAt: new Date() },
    })

    // If accepted, add user as team member
    if (action === 'accept') {
      // Check if already a member
      const existingMember = await getTeamMembership(id, session.userId)
      if (!existingMember) {
        // Check max members
        const team = await db.team.findUnique({ where: { id } })
        if (team) {
          const currentCount = await db.teamMember.count({ where: { teamId: id } })
          if (currentCount >= team.maxMembers) {
            end(400)
            return NextResponse.json({ success: false, error: 'Team has reached maximum member limit' }, { status: 400 })
          }
        }

        await db.teamMember.create({
          data: {
            teamId: id,
            userId: session.userId,
            role: invite.role,
            nickname: session.user.name || null,
          },
        })

        // Log join activity
        await db.teamActivity.create({
          data: {
            teamId: id,
            userId: session.userId,
            userName: session.user.name || null,
            type: 'invite_accepted',
            details: JSON.stringify({ inviteId }),
          },
        })
      }
    }

    // Log activity
    await db.teamActivity.create({
      data: {
        teamId: id,
        userId: session.userId,
        userName: session.user.name || null,
        type: action === 'accept' ? 'invite_accepted' : 'team_updated',
        details: JSON.stringify({
          action: `invite_${newStatus}`,
          inviteId,
          invitedBy: invite.invitedBy,
        }),
      },
    })

    end(200)
    return NextResponse.json({ success: true, data: { status: newStatus, message: `Invite ${newStatus}` } })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ success: false, error: 'Failed to respond to invite' }, { status: 500 })
  }
}
