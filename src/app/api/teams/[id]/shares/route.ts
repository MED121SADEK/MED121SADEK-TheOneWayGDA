import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest } from '@/lib/auth'
import { apiRouteLogger } from '@/lib/api-logger'

const log = apiRouteLogger('/api/teams/[id]/shares')

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

const VALID_RESOURCE_TYPES = ['workflow', 'analysis', 'project', 'benchmark_config', 'template']

// GET /api/teams/[id]/shares — List shared resources for a team
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
    const type = searchParams.get('type')
    const pinned = searchParams.get('pinned')

    const where: Record<string, unknown> = { teamId: id }
    if (type && VALID_RESOURCE_TYPES.includes(type)) {
      where.resourceType = type
    }
    if (pinned === 'true') {
      where.isPinned = true
    }

    const shares = await db.teamShare.findMany({
      where,
      orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    })

    end(200)
    return NextResponse.json({ success: true, data: shares })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ success: false, error: 'Failed to fetch shared resources' }, { status: 500 })
  }
}

// POST /api/teams/[id]/shares — Share a resource with the team
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
    const { resourceType, resourceId, resourceName, description, permissions } = body

    if (!resourceType || !VALID_RESOURCE_TYPES.includes(resourceType)) {
      end(400)
      return NextResponse.json({
        success: false,
        error: `resourceType must be one of: ${VALID_RESOURCE_TYPES.join(', ')}`,
      }, { status: 400 })
    }

    if (!resourceId) {
      end(400)
      return NextResponse.json({ success: false, error: 'resourceId is required' }, { status: 400 })
    }

    if (!resourceName?.trim()) {
      end(400)
      return NextResponse.json({ success: false, error: 'resourceName is required' }, { status: 400 })
    }

    const permissionsStr = permissions
      ? typeof permissions === 'string'
        ? permissions
        : JSON.stringify(permissions)
      : JSON.stringify(['view'])

    const share = await db.teamShare.create({
      data: {
        teamId: id,
        sharedBy: session.userId,
        resourceType,
        resourceId,
        resourceName: resourceName.trim(),
        description: description?.trim() || null,
        permissions: permissionsStr,
      },
    })

    // Log activity
    await db.teamActivity.create({
      data: {
        teamId: id,
        userId: session.userId,
        userName: session.user.name || null,
        type: 'resource_shared',
        details: JSON.stringify({
          shareId: share.id,
          resourceType,
          resourceName: resourceName.trim(),
        }),
      },
    })

    end(201)
    return NextResponse.json({ success: true, data: share }, { status: 201 })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ success: false, error: 'Failed to share resource' }, { status: 500 })
  }
}
