import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest } from '@/lib/auth'
import { apiRouteLogger } from '@/lib/api-logger'

const log = apiRouteLogger('/api/teams/[id]/comments')

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

// GET /api/teams/[id]/comments — Get comments for a team
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
    const shareId = searchParams.get('shareId')

    const where: Record<string, unknown> = { teamId: id }
    if (shareId) {
      where.shareId = shareId
    }

    const comments = await db.teamComment.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: 200,
    })

    end(200)
    return NextResponse.json({ success: true, data: comments })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ success: false, error: 'Failed to fetch comments' }, { status: 500 })
  }
}

// POST /api/teams/[id]/comments — Add a comment
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

    // Check membership
    const membership = await getTeamMembership(id, session.userId)
    if (!membership) {
      end(403)
      return NextResponse.json({ success: false, error: 'Not a team member' }, { status: 403 })
    }

    const body = await request.json()
    const { content, shareId } = body

    if (!content?.trim()) {
      end(400)
      return NextResponse.json({ success: false, error: 'Comment content is required' }, { status: 400 })
    }

    if (content.trim().length > 5000) {
      end(400)
      return NextResponse.json({ success: false, error: 'Comment is too long (max 5,000 chars)' }, { status: 400 })
    }

    // If shareId provided, verify it exists for this team
    if (shareId) {
      const share = await db.teamShare.findUnique({ where: { id: shareId } })
      if (!share || share.teamId !== id) {
        end(404)
        return NextResponse.json({ success: false, error: 'Shared resource not found' }, { status: 404 })
      }
    }

    const comment = await db.teamComment.create({
      data: {
        teamId: id,
        shareId: shareId || null,
        userId: session.userId,
        userName: session.user.name || null,
        content: content.trim(),
      },
    })

    // Log activity
    await db.teamActivity.create({
      data: {
        teamId: id,
        userId: session.userId,
        userName: session.user.name || null,
        type: 'comment_added',
        details: JSON.stringify({
          commentId: comment.id,
          shareId: shareId || null,
        }),
      },
    })

    end(201)
    return NextResponse.json({ success: true, data: comment }, { status: 201 })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ success: false, error: 'Failed to add comment' }, { status: 500 })
  }
}
