import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest } from '@/lib/auth'
import { apiRouteLogger } from '@/lib/api-logger'

const log = apiRouteLogger('/api/teams/[id]/activity')

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

// GET /api/teams/[id]/activity — Get team activity feed
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

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    const activities = await db.teamActivity.findMany({
      where: { teamId: id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    const total = await db.teamActivity.count({ where: { teamId: id } })

    end(200)
    return NextResponse.json({
      success: true,
      data: activities,
      pagination: {
        limit,
        offset,
        total,
        hasMore: offset + limit < total,
      },
    })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ success: false, error: 'Failed to fetch activity feed' }, { status: 500 })
  }
}
