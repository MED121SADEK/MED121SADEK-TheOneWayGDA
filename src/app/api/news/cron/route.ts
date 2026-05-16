import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { fetchNewsFromWeb } from '@/app/api/community/news/route'

/**
 * News Cron Job — called by Vercel Cron 3x daily (8AM, 2PM, 10PM UTC)
 * Fetches the latest AI news from web search and saves to database.
 * 
 * Triggered via: GET /api/news/cron
 * Vercel Cron config in vercel.json
 */
export async function GET() {
  const startTime = Date.now()
  let fetched = 0
  let saved = 0
  let errors = 0

  try {
    console.log(`[NewsCron] Starting news fetch at ${new Date().toISOString()}`)

    // Fetch up to 24 search queries (all categories)
    const newsItems = await fetchNewsFromWeb(12)
    fetched = newsItems.length

    // Save each new item to the database
    for (const item of newsItems) {
      try {
        const existing = await db.communityPost.findFirst({
          where: { sourceUrl: item.url },
        })
        if (existing) continue

        const companyNames = (item.matchedCompanies || []).map((c: any) => c.name)
        const tags = ['AI News', 'Auto-Published', 'Cron']
        if (companyNames.length > 0) tags.push(...companyNames.slice(0, 3))

        await db.communityPost.create({
          data: {
            type: 'news',
            title: item.title,
            content: item.snippet,
            author: 'TheOneWayGDA',
            authorName: 'AI News Cron',
            sourceUrl: item.url,
            sourceName: item.hostName,
            tags: JSON.stringify(tags),
            featured: (item.relevanceScore || 0) >= 5,
          },
        })
        saved++
      } catch (err) {
        errors++
        console.error(`[NewsCron] Error saving item:`, err)
      }
    }

    // Clean up old news (keep last 500)
    try {
      const totalCount = await db.communityPost.count({ where: { type: 'news' } })
      if (totalCount > 500) {
        const oldNews = await db.communityPost.findMany({
          where: { type: 'news' },
          orderBy: { createdAt: 'asc' },
          take: totalCount - 500,
          select: { id: true },
        })
        if (oldNews.length > 0) {
          const ids = oldNews.map(n => n.id)
          await db.communityPost.deleteMany({ where: { id: { in: ids } } })
          console.log(`[NewsCron] Cleaned up ${oldNews.length} old news items`)
        }
      }
    } catch (err) {
      console.error(`[NewsCron] Cleanup error:`, err)
    }

    const duration = Date.now() - startTime
    console.log(`[NewsCron] Completed: ${fetched} fetched, ${saved} saved, ${errors} errors in ${duration}ms`)

    // Update cron job status in DB if table exists
    try {
      await db.cronJob.upsert({
        where: { name: 'news-fetcher' },
        create: {
          name: 'news-fetcher',
          type: 'news',
          interval: '8h',
          status: 'completed',
          lastRun: new Date(),
          runCount: 1,
          nextRun: new Date(Date.now() + 8 * 60 * 60 * 1000),
        },
        update: {
          status: 'completed',
          lastRun: new Date(),
          runCount: { increment: 1 },
          nextRun: new Date(Date.now() + 8 * 60 * 60 * 1000),
          lastError: null,
        },
      })
    } catch {
      // CronJob table might not exist yet
    }

    return NextResponse.json({
      success: true,
      message: `News cron completed`,
      stats: {
        fetched,
        saved,
        errors,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[NewsCron] Fatal error:`, message)

    try {
      await db.cronJob.upsert({
        where: { name: 'news-fetcher' },
        create: {
          name: 'news-fetcher',
          type: 'news',
          interval: '8h',
          status: 'failed',
          lastRun: new Date(),
          runCount: 1,
          lastError: message.substring(0, 500),
          nextRun: new Date(Date.now() + 8 * 60 * 60 * 1000),
        },
        update: {
          status: 'failed',
          lastRun: new Date(),
          lastError: message.substring(0, 500),
        },
      })
    } catch {
      // Ignore
    }

    return NextResponse.json({
      success: false,
      error: message,
      stats: { fetched, saved, errors, duration: `${Date.now() - startTime}ms` },
    }, { status: 500 })
  }
}
