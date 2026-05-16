import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { fetchNewsFromWeb } from '@/app/api/community/news/route'

/**
 * AI News & Community Auto-Publisher
 *
 * Creates short-form posts (max 280 chars) from AI news, formatted like Twitter/X posts.
 * Each post has: headline, 1-2 key facts, link, 2-3 hashtags, category (AI/Research/Innovation).
 *
 * Called by Vercel Cron hourly.
 * Trigger: GET /api/community/publish?shift=0
 * Startup (initial seeding): GET /api/community/publish?startup=true
 */

/** Classify news category into AI | Research | Innovation */
function classifyCategory(newsCategory: string): string {
  const mapping: Record<string, string> = {
    'Foundation Models': 'AI',
    'AI Agents': 'AI',
    'AI Assistants': 'AI',
    'AI Video': 'AI',
    'AI Image': 'AI',
    'AI Audio': 'AI',
    'AI Developer Tools': 'Innovation',
    'AI Frameworks': 'Innovation',
    'AI Hardware': 'AI',
    'AI Search': 'AI',
    'Enterprise AI': 'AI',
    'AI Research': 'Research',
    'Funding': 'Innovation',
  }
  return mapping[newsCategory] || 'AI'
}

/** Generate relevant hashtags based on category and content */
function generateHashtags(title: string, snippet: string, category: string, companies: string[]): string[] {
  const hashtags = ['#AI']
  const text = `${title} ${snippet}`.toLowerCase()
  const cats: Record<string, string[]> = {
    'AI': ['#AI', '#MachineLearning', '#LLM'],
    'Research': ['#Research', '#Science', '#Paper'],
    'Innovation': ['#Innovation', '#Tech', '#Startup'],
  }
  const extra = cats[category] || cats['AI']
  for (const h of extra) {
    if (!hashtags.includes(h)) hashtags.push(h)
  }

  if (text.includes('open source')) hashtags.push('#OpenSource')
  if (text.includes('benchmark') || text.includes('leaderboard')) hashtags.push('#Benchmark')
  if (text.includes('deepseek') || text.includes('open weights')) hashtags.push('#OpenWeights')
  if (text.includes('coding') || text.includes('developer')) hashtags.push('#DevTools')
  if (text.includes('video generation')) hashtags.push('#AIVideo')
  if (text.includes('image generation')) hashtags.push('#AIImage')
  if (text.includes('voice') || text.includes('audio') || text.includes('music')) hashtags.push('#AIAudio')
  if (text.includes('reasoning') || text.includes('chain-of-thought')) hashtags.push('#Reasoning')
  if (text.includes('agent') || text.includes('autonomous')) hashtags.push('#AIAgents')
  if (text.includes('chip') || text.includes('gpu') || text.includes('nvidia')) hashtags.push('#AIHardware')
  if (text.includes('regulation') || text.includes('policy') || text.includes('safety')) hashtags.push('#AIEthics')
  if (text.includes('china') || text.includes('alibaba') || text.includes('deepseek') || text.includes('qwen')) hashtags.push('#ChinaAI')

  if (companies.length > 0) {
    const companyHashtag = '#' + companies[0].replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '')
    if (companyHashtag.length <= 20 && !hashtags.includes(companyHashtag)) {
      hashtags.push(companyHashtag)
    }
  }

  return hashtags.slice(0, 3)
}

/** Create a short-form post (max 280 chars) from news item */
function formatMicroPost(title: string, snippet: string, url: string, category: string, companies: string[]): {
  headline: string
  content: string
  hashtags: string[]
  fullText: string
} {
  let headline = title.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim()
  if (headline.length > 120) headline = headline.slice(0, 117) + '...'

  let facts = snippet.replace(/<[^>]*>/g, '').trim()
  if (facts.length > 140) facts = facts.slice(0, 137) + '...'

  const hashtags = generateHashtags(title, snippet, category, companies)

  let fullText = `${headline}\n\n${facts}\n\n${hashtags.join(' ')}`
  if (url && fullText.length + url.length < 300) {
    fullText += `\n${url}`
  }
  if (fullText.length > 280) {
    fullText = fullText.slice(0, 277) + '...'
  }

  return { headline, content: facts, hashtags, fullText }
}

export async function GET(request: Request) {
  const startTime = Date.now()
  let fetched = 0
  let published = 0
  let skipped = 0

  try {
    const { searchParams } = new URL(request.url)
    const shift = searchParams.get('shift') || '0'
    const isStartup = searchParams.get('startup') === 'true'

    console.log(`[Publisher] Starting auto-publish at ${new Date().toISOString()} (shift: ${shift}, startup: ${isStartup})`)

    const numQueries = isStartup ? 24 : 8
    const newsItems = await fetchNewsFromWeb(numQueries)
    fetched = newsItems.length

    for (const item of newsItems) {
      try {
        const existing = await db.communityPost.findFirst({
          where: { sourceUrl: item.url },
        })
        if (existing) {
          skipped++
          continue
        }

        const category = item.category || 'AI'
        const newsCategory = classifyCategory(category)
        const companyNames = (item.matchedCompanies || []).map((c: any) => c.name)

        const microPost = formatMicroPost(
          item.title,
          item.snippet,
          item.url,
          category,
          companyNames,
        )

        const tags = [newsCategory, 'Auto-Published', 'Community']
        if (category && category !== 'AI News') tags.push(category)
        if (companyNames.length > 0) tags.push(...companyNames.slice(0, 3))
        tags.push(...microPost.hashtags.map(h => h.replace('#', '')))

        await db.communityPost.create({
          data: {
            type: 'news',
            title: microPost.headline,
            content: microPost.fullText,
            author: 'THEONEWAYGDA_AI',
            authorName: 'AI News Bot',
            sourceUrl: item.url,
            sourceName: item.hostName,
            tags: JSON.stringify([...new Set(tags)]),
            featured: (item.relevanceScore || 0) >= 10,
          },
        })
        published++
      } catch (err) {
        console.error('[Publisher] Error publishing item:', err)
      }
    }

    const duration = Date.now() - startTime
    console.log(`[Publisher] Completed: ${fetched} fetched, ${published} published, ${skipped} skipped in ${duration}ms`)

    try {
      await db.cronJob.upsert({
        where: { name: 'community-publisher' },
        create: {
          name: 'community-publisher',
          type: 'news',
          interval: '1h',
          status: 'completed',
          lastRun: new Date(),
          runCount: 1,
          nextRun: new Date(Date.now() + 60 * 60 * 1000),
        },
        update: {
          status: 'completed',
          lastRun: new Date(),
          runCount: { increment: 1 },
          nextRun: new Date(Date.now() + 60 * 60 * 1000),
          lastError: null,
        },
      })
    } catch { /* ignore */ }

    return NextResponse.json({
      success: true,
      message: `Auto-publish completed`,
      stats: { fetched, published, skipped, duration: `${duration}ms`, shift, isStartup, timestamp: new Date().toISOString() },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[Publisher] Fatal error:`, message)
    return NextResponse.json({
      success: false,
      error: message,
      stats: { fetched, published, skipped, duration: `${Date.now() - startTime}ms` },
    }, { status: 500 })
  }
}
