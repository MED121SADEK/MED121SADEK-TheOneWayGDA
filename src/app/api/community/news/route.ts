import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { NEWS_SEARCH_QUERIES, matchCompanies, AI_COMPANIES } from '@/lib/ai-companies'

// Server-side in-memory cache (per cold start)
let cachedNews: any[] | null = null
let lastFetch = 0
const CACHE_TTL = 2 * 60 * 60 * 1000 // 2 hours (shorter for fresher news)

function sanitizeContent(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 5000)
}

/** Relevance scoring: how related is this news item to our AI focus */
function scoreRelevance(item: { title: string; snippet: string }): number {
  const text = `${item.title} ${item.snippet}`.toLowerCase()
  let score = 0

  // High-value keywords (model releases, company names)
  const highValue = [
    'gpt-5', 'gpt-4o', 'claude 4', 'gemini 2', 'llama 4', 'deepseek', 'qwen 3',
    'new model', 'release', 'launch', 'announcement', 'breakthrough',
    'openai', 'anthropic', 'google', 'meta', 'nvidia', 'mistral', 'xai',
    'alibaba', 'baidu', 'tencent', 'bytedance', 'zhipu', 'minimax',
    'benchmark', 'leaderboard', 'performance', 'state-of-the-art',
    'ai agent', 'autonomous', 'reasoning', 'coding assistant',
  ]
  const mediumValue = [
    'artificial intelligence', 'machine learning', 'deep learning', 'llm',
    'generative', 'transformer', 'neural network', 'nlp', 'computer vision',
    'ai tool', 'ai platform', 'open source', 'foundation model',
  ]

  for (const kw of highValue) {
    if (text.includes(kw)) score += 3
  }
  for (const kw of mediumValue) {
    if (text.includes(kw)) score += 1
  }

  // Penalize very short snippets (likely low quality)
  if (item.snippet.length < 50) score -= 2

  return score
}

/** Core news fetching logic — shared between GET and cron */
export async function fetchNewsFromWeb(maxQueries?: number): Promise<any[]> {
  const numQueries = maxQueries || 8
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ZAI = require('z-ai-web-dev-sdk').default
  const zai = await ZAI.create()

  const allResults: any[] = []

  // Search queries in batches of 4 (parallel)
  const batches: string[][] = []
  for (let i = 0; i < Math.min(numQueries, NEWS_SEARCH_QUERIES.length); i += 4) {
    batches.push(NEWS_SEARCH_QUERIES.slice(i, i + 4))
  }

  for (const batch of batches) {
    const promises = batch.map(async (query) => {
      try {
        const results = await zai.functions.invoke('web_search', { query, num: 6 })
        return results || []
      } catch {
        return []
      }
    })
    const batchResults = await Promise.all(promises)
    allResults.push(...batchResults.flat())
  }

  // Deduplicate by URL
  const seenUrls = new Set<string>()
  const unique: any[] = []
  for (const item of allResults) {
    if (!item.url || seenUrls.has(item.url)) continue
    seenUrls.add(item.url)
    unique.push({
      title: sanitizeContent(item.name || ''),
      snippet: sanitizeContent(item.snippet || ''),
      url: item.url,
      hostName: item.hostName || '',
      date: item.date || '',
      favicon: item.favicon || '',
    })
  }

  // Score and sort by relevance
  const scored = unique.map(item => ({
    ...item,
    relevanceScore: scoreRelevance(item),
    matchedCompanies: matchCompanies(`${item.title} ${item.snippet}`).map(c => ({
      id: c.id,
      name: c.name,
      logo: c.logo,
      region: c.region,
    })),
  }))

  scored.sort((a, b) => b.relevanceScore - a.relevanceScore)

  // Filter out low-relevance items
  const filtered = scored.filter(item => item.relevanceScore >= 0)

  return filtered.slice(0, 30)
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('refresh') === 'true'
    const companyFilter = searchParams.get('company') || ''
    const limit = parseInt(searchParams.get('limit') || '20')
    const page = parseInt(searchParams.get('page') || '1')

    const now = Date.now()

    // Return cached if still fresh (unless force refresh)
    if (!forceRefresh && cachedNews && now - lastFetch < CACHE_TTL) {
      let results = cachedNews
      if (companyFilter) {
        results = results.filter(n =>
          n.matchedCompanies?.some((c: any) => c.id === companyFilter || c.name.toLowerCase().includes(companyFilter.toLowerCase()))
        )
      }
      return NextResponse.json({
        news: results.slice((page - 1) * limit, page * limit),
        total: results.length,
        cached: true,
        fetchedAt: new Date(lastFetch).toISOString(),
        companies: AI_COMPANIES.map(c => ({ id: c.id, name: c.name, logo: c.logo, region: c.region, category: c.category })),
      })
    }

    // Fetch fresh news
    const freshNews = await fetchNewsFromWeb(8)

    // Save new items to database
    let savedCount = 0
    for (const item of freshNews) {
      try {
        const existing = await db.communityPost.findFirst({
          where: { sourceUrl: item.url },
        })
        if (existing) continue

        const companyNames = item.matchedCompanies?.map((c: any) => c.name) || []
        const tags = ['AI News', 'Auto-Published']
        if (companyNames.length > 0) tags.push(...companyNames)

        await db.communityPost.create({
          data: {
            type: 'news',
            title: item.title,
            content: item.snippet,
            author: 'TheOneWayGDA',
            authorName: 'AI News Bot',
            sourceUrl: item.url,
            sourceName: item.hostName,
            tags: JSON.stringify(tags),
            featured: item.relevanceScore >= 5,
          },
        })
        savedCount++
      } catch {
        // Skip individual DB errors
      }
    }

    cachedNews = freshNews
    lastFetch = now

    let results = freshNews
    if (companyFilter) {
      results = results.filter(n =>
        n.matchedCompanies?.some((c: any) => c.id === companyFilter || c.name.toLowerCase().includes(companyFilter.toLowerCase()))
      )
    }

    return NextResponse.json({
      news: results.slice((page - 1) * limit, page * limit),
      total: results.length,
      cached: false,
      fetchedAt: new Date().toISOString(),
      savedNew: savedCount,
      totalStored: await db.communityPost.count({ where: { type: 'news' } }),
      companies: AI_COMPANIES.map(c => ({ id: c.id, name: c.name, logo: c.logo, region: c.region, category: c.category })),
    })
  } catch (error) {
    console.error('News fetch error:', error)

    // Fallback: return stored news from DB
    try {
      const storedNews = await db.communityPost.findMany({
        where: { type: 'news' },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })

      return NextResponse.json({
        news: storedNews.map(n => ({
          id: n.id,
          title: n.title,
          snippet: n.content,
          url: n.sourceUrl,
          hostName: n.sourceName,
          date: n.createdAt,
          matchedCompanies: matchCompanies(`${n.title} ${n.content}`).map(c => ({
            id: c.id, name: c.name, logo: c.logo, region: c.region,
          })),
        })),
        cached: true,
        fallback: true,
        total: storedNews.length,
        companies: AI_COMPANIES.map(c => ({ id: c.id, name: c.name, logo: c.logo, region: c.region, category: c.category })),
      })
    } catch {
      return NextResponse.json(
        { error: 'Failed to fetch news', news: [], total: 0 },
        { status: 500 }
      )
    }
  }
}
