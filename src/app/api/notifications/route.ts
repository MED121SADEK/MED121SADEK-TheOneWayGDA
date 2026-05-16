import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest } from '@/lib/auth'
import { apiRouteLogger } from '@/lib/api-logger'

const log = apiRouteLogger('/api/notifications')

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

// GET /api/notifications — List user's notifications
export async function GET(request: NextRequest) {
  const end = log.start('GET')
  try {
    const session = await authenticate(request)
    if (!session) {
      end(401)
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10) || 20, 1), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0)

    const where: Record<string, unknown> = { userId: session.userId }
    if (unreadOnly) {
      where.isRead = false
    }

    const [notifications, totalCount] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          type: true,
          title: true,
          message: true,
          actionUrl: true,
          actionLabel: true,
          isRead: true,
          readAt: true,
          metadata: true,
          createdAt: true,
        },
      }),
      db.notification.count({ where }),
    ])

    end(200)
    return NextResponse.json({
      success: true,
      data: {
        notifications,
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ success: false, error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

// POST /api/notifications — Create notification (system use)
export async function POST(request: NextRequest) {
  const end = log.start('POST')
  try {
    const session = await authenticate(request)
    if (!session) {
      end(401)
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, type, title, message, actionUrl, actionLabel, metadata } = body

    // Determine target userId
    let targetUserId = userId
    if (!targetUserId) {
      targetUserId = session.userId
    }

    // Only admin can create notifications for other users
    if (targetUserId !== session.userId && session.user.role !== 'admin') {
      end(403)
      return NextResponse.json(
        { success: false, error: 'Only admins can create notifications for other users' },
        { status: 403 }
      )
    }

    // Validate required fields
    if (!type?.trim()) {
      end(400)
      return NextResponse.json({ success: false, error: 'Notification type is required' }, { status: 400 })
    }

    const validTypes = ['team_invite', 'team_member_joined', 'resource_shared', 'usage_alert', 'system', 'billing']
    if (!validTypes.includes(type.trim())) {
      end(400)
      return NextResponse.json(
        { success: false, error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    if (!title?.trim()) {
      end(400)
      return NextResponse.json({ success: false, error: 'Notification title is required' }, { status: 400 })
    }

    if (!message?.trim()) {
      end(400)
      return NextResponse.json({ success: false, error: 'Notification message is required' }, { status: 400 })
    }

    // Validate target user exists
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId },
      select: { id: true },
    })
    if (!targetUser) {
      end(404)
      return NextResponse.json({ success: false, error: 'Target user not found' }, { status: 404 })
    }

    // Auto-create subscription on first usage if missing (as per spec)
    const existingSubscription = await db.subscription.findUnique({
      where: { userId: targetUserId },
    })
    if (!existingSubscription) {
      await db.subscription.create({
        data: {
          userId: targetUserId,
          plan: 'free',
          status: 'active',
        },
      })
    }

    // Create notification
    const notification = await db.notification.create({
      data: {
        userId: targetUserId,
        type: type.trim(),
        title: title.trim(),
        message: message.trim(),
        actionUrl: actionUrl?.trim() || null,
        actionLabel: actionLabel?.trim() || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    })

    end(201)
    return NextResponse.json(
      { success: true, data: notification },
      { status: 201 }
    )
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ success: false, error: 'Failed to create notification' }, { status: 500 })
  }
}

// PATCH /api/notifications — Mark notifications as read
export async function PATCH(request: NextRequest) {
  const end = log.start('PATCH')
  try {
    const session = await authenticate(request)
    if (!session) {
      end(401)
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { notificationId, markAllRead } = body

    if (markAllRead === true) {
      // Mark all unread notifications as read
      const result = await db.notification.updateMany({
        where: {
          userId: session.userId,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: new Date(),
        },
      })

      end(200)
      return NextResponse.json({
        success: true,
        message: `Marked ${result.count} notification(s) as read`,
        count: result.count,
      })
    }

    // Mark a single notification as read
    if (!notificationId) {
      end(400)
      return NextResponse.json(
        { success: false, error: 'Either notificationId or markAllRead is required' },
        { status: 400 }
      )
    }

    // Verify the notification belongs to the current user
    const notification = await db.notification.findUnique({
      where: { id: notificationId },
      select: { id: true, userId: true, isRead: true },
    })

    if (!notification) {
      end(404)
      return NextResponse.json({ success: false, error: 'Notification not found' }, { status: 404 })
    }

    if (notification.userId !== session.userId) {
      end(403)
      return NextResponse.json({ success: false, error: 'You can only mark your own notifications' }, { status: 403 })
    }

    if (notification.isRead) {
      end(200)
      return NextResponse.json({ success: true, message: 'Notification already read', data: { id: notificationId, isRead: true } })
    }

    const updated = await db.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    end(200)
    return NextResponse.json({ success: true, data: updated })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ success: false, error: 'Failed to update notification' }, { status: 500 })
  }
}

// DELETE /api/notifications — Delete a notification
export async function DELETE(request: NextRequest) {
  const end = log.start('DELETE')
  try {
    const session = await authenticate(request)
    if (!session) {
      end(401)
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { notificationId } = body

    if (!notificationId) {
      end(400)
      return NextResponse.json({ success: false, error: 'notificationId is required' }, { status: 400 })
    }

    // Verify the notification belongs to the current user
    const notification = await db.notification.findUnique({
      where: { id: notificationId },
      select: { id: true, userId: true },
    })

    if (!notification) {
      end(404)
      return NextResponse.json({ success: false, error: 'Notification not found' }, { status: 404 })
    }

    if (notification.userId !== session.userId) {
      end(403)
      return NextResponse.json({ success: false, error: 'You can only delete your own notifications' }, { status: 403 })
    }

    await db.notification.delete({ where: { id: notificationId } })

    end(200)
    return NextResponse.json({ success: true, message: 'Notification deleted successfully' })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ success: false, error: 'Failed to delete notification' }, { status: 500 })
  }
}
