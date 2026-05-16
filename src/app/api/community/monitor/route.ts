import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Community Monitor — Self-Maintenance Engine
 *
 * Monitors:
 * - Feed activity (posts per hour, engagement rate)
 * - Error rates in cron jobs
 * - User reports / flagged content
 *
 * Actions:
 * - Auto-alert when activity drops below threshold
 * - Remove/hide spam, hate speech, misinformation
 * - Log metrics for dashboard display
 *
 * Called by Vercel Cron hourly:
 *   GET /api/community/monitor
 */

// ─── Content moderation rules ───

const SPAM_PATTERNS = [
  /(?:click here|visit now|free money|earn \$?\d{4,}|make money|crypto giveaway|airdrop|limited time offer|buy now|subscribe.*link)/i,
  /(?:http[s]?:\/\/){3,}/i, // 3+ URLs in one post
  /(?:.{0,20})(https?:\/\/\S+)(?:.{0,20})(https?:\/\/\S+)(?:.{0,20})(https?:\/\/\S+)/i, // 3+ URLs
  /(?:follow me|follow back|like for like|s4s|sub4sub|shoutout for shoutout)/i,
]

const HATE_SPEECH_PATTERNS = [
  // Basic patterns — can be expanded with ML-based detection
  /(?:hate\s+speech|racial slur|ethnic cleansing)/i,
  /(?:kill\s+(?:all|them|yourself)|go\s+die|end\s+your\s+life)/i,
  /(?:nazi|white supremacy|ethnic superiority)/i,
]

const MISINFORMATION_PATTERNS = [
  // High-confidence misinformation patterns
  /(?:5G causes (?:cancer|virus|COVID))/i,
  /(?:earth is flat|flat earth)/i,
  /(?:vaccines cause autism|anti-vaxx)/i,
  /(?:COVID is (?:a hoax|fake|not real))/i,
  /(?:miracle cure for (?:cancer|COVID|AIDS))/i,
]

interface ModerationResult {
  action: 'hide' | 'delete' | 'none'
  reason: string
  confidence: 'high' | 'medium' | 'low'
}

function moderateContent(title: string, content: string): ModerationResult {
  const fullText = `${title} ${content}`

  for (const pattern of HATE_SPEECH_PATTERNS) {
    if (pattern.test(fullText)) {
      return { action: 'delete', reason: 'Hate speech detected', confidence: 'high' }
    }
  }

  for (const pattern of MISINFORMATION_PATTERNS) {
    if (pattern.test(fullText)) {
      return { action: 'hide', reason: 'Potential misinformation', confidence: 'medium' }
    }
  }

  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(fullText)) {
      return { action: 'hide', reason: 'Spam pattern detected', confidence: 'medium' }
    }
  }

  return { action: 'none', reason: '', confidence: 'low' }
}

// ─── Activity metrics ───

async function getActivityMetrics() {
  const now = new Date()
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [
    postsLastHour,
    postsLast6h,
    postsLast24h,
    autoPostsLast24h,
    userPostsLast24h,
    totalInteractionsLast24h,
    cronJobs,
    totalPosts,
  ] = await Promise.all([
    db.communityPost.count({ where: { createdAt: { gte: oneHourAgo } } }),
    db.communityPost.count({ where: { createdAt: { gte: sixHoursAgo } } }),
    db.communityPost.count({ where: { createdAt: { gte: twentyFourHoursAgo } } }),
    db.communityPost.count({ where: { author: 'THEONEWAYGDA_AI', createdAt: { gte: twentyFourHoursAgo } } }),
    db.communityPost.count({ where: { author: { not: 'THEONEWAYGDA_AI' }, createdAt: { gte: twentyFourHoursAgo } } }),
    db.postInteraction.count({ where: { createdAt: { gte: twentyFourHoursAgo } } }),
    db.cronJob.findMany({ orderBy: { lastRun: 'desc' }, take: 10 }),
    db.communityPost.count(),
  ])

  // Calculate engagement rate
  const recentPosts = await db.communityPost.findMany({
    where: { createdAt: { gte: twentyFourHoursAgo } },
    select: { likes: true, comments: true, reposts: true, saves: true },
  })
  const totalEngagement = recentPosts.reduce((sum, p) => sum + p.likes + p.comments + p.reposts + p.saves, 0)
  const engagementRate = postsLast24h > 0 ? (totalEngagement / postsLast24h).toFixed(2) : '0'

  // Cron health
  const failedCrons = cronJobs.filter(c => c.status === 'failed')
  const staleCrons = cronJobs.filter(c => c.nextRun && new Date(c.nextRun) < now && c.status !== 'running')

  return {
    current: {
      postsPerHour: postsLastHour,
      postsLast6h,
      postsLast24h,
      autoPostsLast24h,
      userPostsLast24h,
      totalInteractionsLast24h,
      engagementRate: parseFloat(engagementRate),
    },
    health: {
      totalPosts,
      failedCrons: failedCrons.length,
      staleCrons: staleCrons.length,
      cronDetails: cronJobs.map(c => ({
        name: c.name,
        status: c.status,
        lastRun: c.lastRun,
        lastError: c.lastError,
      })),
    },
    thresholds: {
      minPostsPerHour: 1, // Alert if < 1 post per hour in last 3h
      minPostsPer6h: 3,   // Alert if < 3 posts in last 6h
    },
  }
}

// ─── Content moderation scan ───

async function scanAndModerate(): Promise<{ scanned: number; actions: any[] }> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  // Only scan user posts (not auto-published)
  const userPosts = await db.communityPost.findMany({
    where: {
      author: { not: 'THEONEWAYGDA_AI' },
      createdAt: { gte: twentyFourHoursAgo },
    },
    select: { id: true, title: true, content: true },
  })

  const actions: any[] = []

  for (const post of userPosts) {
    const result = moderateContent(post.title, post.content)

    if (result.action === 'delete') {
      try {
        await db.postComment.deleteMany({ where: { postId: post.id } })
        await db.postInteraction.deleteMany({ where: { postId: post.id } })
        await db.communityPost.delete({ where: { id: post.id } })
        actions.push({ postId: post.id, action: 'deleted', reason: result.reason })
        console.log(`[Monitor] Deleted post ${post.id}: ${result.reason}`)
      } catch (err) {
        console.error(`[Monitor] Error deleting post ${post.id}:`, err)
      }
    } else if (result.action === 'hide') {
      try {
        // "Hide" by removing featured flag and adding a hidden tag
        await db.communityPost.update({
          where: { id: post.id },
          data: {
            featured: false,
            tags: JSON.stringify(['Hidden', 'Flagged', result.reason]),
          },
        })
        actions.push({ postId: post.id, action: 'hidden', reason: result.reason })
        console.log(`[Monitor] Hidden post ${post.id}: ${result.reason}`)
      } catch (err) {
        console.error(`[Monitor] Error hiding post ${post.id}:`, err)
      }
    }
  }

  return { scanned: userPosts.length, actions }
}

// ─── Auto-alert generation ───

async function generateAlerts(metrics: Awaited<ReturnType<typeof getActivityMetrics>>): Promise<string[]> {
  const alerts: string[] = []

  // Check: posts per hour too low
  if (metrics.current.postsPerHour < metrics.thresholds.minPostsPerHour) {
    alerts.push(`Low activity: Only ${metrics.current.postsPerHour} posts in the last hour (threshold: ${metrics.thresholds.minPostsPerHour}/hour). Consider increasing evergreen content.`)
  }

  // Check: very low activity in last 6h
  if (metrics.current.postsLast6h < metrics.thresholds.minPostsPer6h) {
    alerts.push(`Very low activity: Only ${metrics.current.postsLast6h} posts in the last 6 hours (threshold: ${metrics.thresholds.minPostsPer6h}/6h). The auto-publisher may need attention.`)
  }

  // Check: failed cron jobs
  if (metrics.health.failedCrons > 0) {
    alerts.push(`${metrics.health.failedCrons} cron job(s) in failed state. Check logs and restart if needed.`)
  }

  // Check: stale cron jobs (missed their next run)
  if (metrics.health.staleCrons > 0) {
    alerts.push(`${metrics.health.staleCrons} cron job(s) have stale nextRun times. They may have been skipped.`)
  }

  return alerts
}

// ─── Main handler ───

export async function GET(request: Request) {
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)
    const fullScan = searchParams.get('full') === 'true'

    console.log(`[Monitor] Starting monitoring at ${new Date().toISOString()}`)

    // 1. Collect metrics
    const metrics = await getActivityMetrics()

    // 2. Content moderation scan
    const moderation = await scanAndModerate()

    // 3. Generate alerts
    const alerts = await generateAlerts(metrics)

    // 4. Store monitoring snapshot (reuse CronJob table for monitor data)
    try {
      await db.cronJob.upsert({
        where: { name: 'community-monitor' },
        create: {
          name: 'community-monitor',
          type: 'monitor',
          interval: '1h',
          status: alerts.length > 0 ? 'warning' : 'healthy',
          lastRun: new Date(),
          runCount: 1,
          nextRun: new Date(Date.now() + 60 * 60 * 1000),
          lastError: alerts.length > 0 ? JSON.stringify(alerts).substring(0, 500) : null,
        },
        update: {
          status: alerts.length > 0 ? 'warning' : 'healthy',
          lastRun: new Date(),
          runCount: { increment: 1 },
          nextRun: new Date(Date.now() + 60 * 60 * 1000),
          lastError: alerts.length > 0 ? JSON.stringify(alerts).substring(0, 500) : null,
        },
      })
    } catch { /* ignore */ }

    const duration = Date.now() - startTime
    console.log(`[Monitor] Completed in ${duration}ms — ${alerts.length} alerts, ${moderation.actions.length} moderation actions`)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics,
      moderation,
      alerts,
      status: alerts.length > 0 ? 'warning' : 'healthy',
      duration: `${duration}ms`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[Monitor] Fatal error:`, message)
    return NextResponse.json({
      success: false,
      error: message,
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}
