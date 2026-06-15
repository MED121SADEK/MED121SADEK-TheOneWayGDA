import { authFetch } from '@/lib/auth-fetch'

/**
 * Notification Triggers
 *
 * Server-side and client-side utility functions that create notifications
 * for common application events. Each function calls POST /api/notifications.
 */

export interface NotificationPayload {
  userId?: string
  type: string
  title: string
  message: string
  actionUrl?: string
  actionLabel?: string
  metadata?: Record<string, unknown>
}



/** Internal: send a POST to /api/notifications */
async function createNotification(payload: NotificationPayload): Promise<boolean> {
  try {
    const res = await authFetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return res.ok
  } catch {
    return false
  }
}

// ── Public trigger functions ──

/**
 * Notify a user when someone comments on their post
 */
export async function notifyNewComment(
  postId: string,
  postTitle: string,
  commenterName: string,
  options?: { userId?: string }
): Promise<boolean> {
  return createNotification({
    userId: options?.userId,
    type: 'comment',
    title: `New comment on "${postTitle}"`,
    message: `${commenterName} left a comment on your post.`,
    actionUrl: `/community?p=${postId}`,
    actionLabel: 'View Comment',
    metadata: { postId, commenterName },
  })
}

/**
 * Notify a user when their answer is accepted
 */
export async function notifyAnswerAccepted(
  postId: string,
  postTitle: string,
  options?: { userId?: string }
): Promise<boolean> {
  return createNotification({
    userId: options?.userId,
    type: 'answer_accepted',
    title: `Answer accepted on "${postTitle}"`,
    message: 'Your answer was marked as the accepted solution! Great work.',
    actionUrl: `/community?p=${postId}`,
    actionLabel: 'View Post',
    metadata: { postId },
  })
}

/**
 * Notify a user when they receive a team invitation
 */
export async function notifyTeamInvite(
  teamName: string,
  inviterName: string,
  options?: { userId?: string, inviteUrl?: string }
): Promise<boolean> {
  return createNotification({
    userId: options?.userId,
    type: 'team_invite',
    title: `Invited to join ${teamName}`,
    message: `${inviterName} invited you to join the team "${teamName}".`,
    actionUrl: options?.inviteUrl || '/teams',
    actionLabel: 'View Invitation',
    metadata: { teamName, inviterName },
  })
}

/**
 * Notify team members when a new member joins
 */
export async function notifyTeamMemberJoined(
  teamName: string,
  memberName: string,
  options?: { userId?: string }
): Promise<boolean> {
  return createNotification({
    userId: options?.userId,
    type: 'team_member_joined',
    title: `New member joined ${teamName}`,
    message: `${memberName} has joined the team "${teamName}".`,
    actionUrl: '/teams',
    actionLabel: 'View Team',
    metadata: { teamName, memberName },
  })
}

/**
 * Notify a user when a resource is shared with them
 */
export async function notifyResourceShared(
  resourceName: string,
  sharedByName: string,
  options?: { userId?: string, resourceUrl?: string }
): Promise<boolean> {
  return createNotification({
    userId: options?.userId,
    type: 'resource_shared',
    title: `Resource shared: ${resourceName}`,
    message: `${sharedByName} shared "${resourceName}" with you.`,
    actionUrl: options?.resourceUrl || '/teams',
    actionLabel: 'View Resource',
    metadata: { resourceName, sharedByName },
  })
}

/**
 * Notify a user when they're approaching their usage limit
 */
export async function notifyUsageAlert(
  usage: number,
  limit: number,
  options?: { userId?: string }
): Promise<boolean> {
  const percentage = Math.round((usage / limit) * 100)
  return createNotification({
    userId: options?.userId,
    type: 'usage_alert',
    title: `Usage alert: ${percentage}% of limit reached`,
    message: `You've used ${usage} of ${limit} allowed operations this billing period.`,
    actionUrl: '/billing',
    actionLabel: 'View Usage',
    metadata: { usage, limit, percentage },
  })
}

/**
 * Send a generic system notification
 */
export async function notifySystem(
  message: string,
  options?: { userId?: string, title?: string, actionUrl?: string }
): Promise<boolean> {
  return createNotification({
    userId: options?.userId,
    type: 'system',
    title: options?.title || 'System Notification',
    message,
    actionUrl: options?.actionUrl,
    metadata: { systemGenerated: true },
  })
}
