import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Cached for 6 hours
let cachedNews: any[] | null = null
let lastFetch = 0
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours

const AI_NEWS_QUERIES = [
  'artificial intelligence tools 2026',
  'AI software releases new features',
  'machine learning platforms updates',
  'generative AI news today',
  'AI data analysis tools',
  'ChatGPT Claude Gemini updates',
]

function sanitizeContent(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 5000)
}

export async function GET() {
  try {
    const now = Date.now()

    // Return cached if still fresh
    if (cachedNews && now - lastFetch < CACHE_TTL) {
      return NextResponse.json({
        news: cachedNews,
        cached: true,
        fetchedAt: new Date(lastFetch).toISOString(),
      })
    }

    // Fetch fresh news via web search
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ZAI = require('z-ai-web-dev-sdk').default
    const zai = await ZAI.create()

    const allResults: any[] = []

    // Search multiple queries in parallel
    const promises = AI_NEWS_QUERIES.slice(0, 3).map(async (query) => {
      try {
        const results = await zai.functions.invoke('web_search', {
          query,
          num: 8,
        })
        return results || []
      } catch {
        return []
      }
    })

    const searchResults = await Promise.all(promises)

    // Deduplicate by URL
    const seenUrls = new Set<string>()
    for (const results of searchResults) {
      for (const item of results) {
        if (seenUrls.has(item.url)) continue
        seenUrls.add(item.url)

        allResults.push({
          title: sanitizeContent(item.name || ''),
          snippet: sanitizeContent(item.snippet || ''),
          url: item.url,
          hostName: item.hostName || '',
          date: item.date || '',
          favicon: item.favicon || '',
        })
      }
    }

    // Filter for AI-relevant results
    const aiKeywords = ['ai', 'artificial intelligence', 'machine learning', 'gpt', 'llm', 'claude', 'gemini', 'copilot', 'neural', 'deep learning', 'nlp', 'computer vision', 'generative', 'openai', 'anthropic', 'google ai', 'meta ai', 'mistral', 'open source', 'model', 'agent', 'chatbot', 'automation', 'data analysis']
    const filtered = allResults.filter(item => {
      const text = `${item.title} ${item.snippet}`.toLowerCase()
      return aiKeywords.some(kw => text.includes(kw))
    })

    // Take top 15
    const topNews = filtered.slice(0, 15)

    // Save to DB as news posts (only add new ones)
    for (const item of topNews) {
      // Check if URL already exists
      const existing = await db.communityPost.findFirst({
        where: { sourceUrl: item.url },
      })
      if (existing) continue

      await db.communityPost.create({
        data: {
          type: 'news',
          title: item.title,
          content: item.snippet,
          author: 'TheOneWayGDA',
          authorName: 'AI News Bot',
          sourceUrl: item.url,
          sourceName: item.hostName,
          tags: JSON.stringify(['AI News', 'Artificial Intelligence']),
        },
      })
    }

    cachedNews = topNews
    lastFetch = now

    return NextResponse.json({
      news: topNews,
      cached: false,
      fetchedAt: new Date().toISOString(),
      totalStored: await db.communityPost.count({ where: { type: 'news' } }),
    })
  } catch (error) {
    console.error('News fetch error:', error)

    // Fallback: return stored news from DB
    const storedNews = await db.communityPost.findMany({
      where: { type: 'news' },
      orderBy: { createdAt: 'desc' },
      take: 15,
    })

    return NextResponse.json({
      news: storedNews.map(n => ({
        title: n.title,
        snippet: n.content,
        url: n.sourceUrl,
        hostName: n.sourceName,
        date: n.createdAt,
      })),
      cached: true,
      fallback: true,
    })
  }
}
