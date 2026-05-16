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

/** Determine the news category based on content analysis */
function categorizeNews(item: { title: string; snippet: string }): string {
  const text = `${item.title} ${item.snippet}`.toLowerCase()

  const categories: { keywords: string[]; category: string }[] = [
    { keywords: ['ai agent', 'autonomous', 'ai workflow', 'ai automation', 'ai copilot', 'langgraph', 'crewa', 'autogen', 'ai software engineer'], category: 'AI Agents' },
    { keywords: ['chatbot', 'ai assistant', 'claude', 'chatgpt', 'gemini', 'copilot', 'ai chat', 'ai companion'], category: 'AI Assistants' },
    { keywords: ['video generation', 'ai video', 'sora', 'runway', 'kling', 'hailuo', 'text-to-video', 'heygen', 'synthesia'], category: 'AI Video' },
    { keywords: ['image generation', 'midjourney', 'dall-e', 'stable diffusion', 'ai art', 'ideogram', 'ai image'], category: 'AI Image' },
    { keywords: ['text-to-speech', 'ai voice', 'ai music', 'elevenlabs', 'suno', 'udio', 'ai audio', 'ai dubbing'], category: 'AI Audio' },
    { keywords: ['cursor', 'windsurf', 'github copilot', 'ai code', 'codeium', 'ai ide', 'ai coding', 'ai developer', 'replit'], category: 'AI Developer Tools' },
    { keywords: ['langchain', 'ai sdk', 'ai framework', 'vercel ai', 'ai api', 'hugging face'], category: 'AI Frameworks' },
    { keywords: ['gpu', 'nvidia', 'amd', 'chip', 'blackwell', 'h200', 'hardware', 'inference'], category: 'AI Hardware' },
    { keywords: ['perplexity', 'ai search', 'search engine', 'answer engine'], category: 'AI Search' },
    { keywords: ['enterprise', 'palantir', 'databricks', 'snowflake', 'scale ai'], category: 'Enterprise AI' },
    { keywords: ['foundation model', 'llm', 'language model', 'gpt', 'llama', 'deepseek', 'qwen', 'new model', 'release', 'launch', 'announcement'], category: 'Foundation Models' },
    { keywords: ['regulation', 'policy', 'safety', 'alignment', 'open source', 'research', 'paper', 'benchmark'], category: 'AI Research' },
    { keywords: ['funding', 'investment', 'startup', 'valuation', 'ipo'], category: 'Funding' },
  ]

  for (const cat of categories) {
    if (cat.keywords.some(kw => text.includes(kw))) return cat.category
  }
  return 'AI News'
}

/** Relevance scoring: how related is this news item to our AI focus
 *  Enhanced with more comprehensive keyword matching and weights
 */
function scoreRelevance(item: { title: string; snippet: string }): number {
  const text = `${item.title} ${item.snippet}`.toLowerCase()
  let score = 0

  // Critical keywords — latest model releases and major announcements (weight: 5)
  const criticalValue = [
    'gpt-5', 'gpt-4o', 'claude 4', 'claude 4.5', 'gemini 2.5', 'gemini 2', 'llama 4', 'llama 3',
    'deepseek', 'deepseek r1', 'deepseek v3', 'qwen 3', 'qwen 2.5',
    'new model', 'official release', 'just launched', 'major update',
    'state-of-the-art', 'benchmark', 'leaderboard',
  ]
  // High-value keywords — company names and product launches (weight: 3)
  const highValue = [
    'openai', 'anthropic', 'google', 'meta', 'nvidia', 'mistral', 'xai',
    'alibaba', 'baidu', 'tencent', 'bytedance', 'zhipu', 'minimax', 'moonshot',
    'kling', 'hailuo', 'stepfun', '01.ai',
    'release', 'launch', 'announcement', 'breakthrough', 'upgrade',
    'ai agent', 'autonomous', 'reasoning', 'coding assistant',
    'cursor', 'copilot', 'perplexity', 'runway', 'midjourney', 'elevenlabs',
    'sora', 'dall-e', 'stable diffusion', 'suno',
    'nvidia', 'amd', 'gpu', 'blackwell',
    'india', 'japan', 'korea', 'singapore', 'china ai', 'asian ai',
  ]
  // Medium-value keywords — general AI terms (weight: 1)
  const mediumValue = [
    'artificial intelligence', 'machine learning', 'deep learning', 'llm',
    'generative', 'transformer', 'neural network', 'nlp', 'computer vision',
    'ai tool', 'ai platform', 'open source', 'foundation model',
    'ai video', 'ai image', 'ai audio', 'ai music', 'ai voice',
    'ai coding', 'ai developer', 'ai assistant', 'ai search',
    'text-to-video', 'text-to-image', 'text-to-speech', 'text-to-music',
    'multimodal', 'vision model', 'reasoning model',
    'rag', 'fine-tuning', 'quantization', 'inference',
    'ai startup', 'funding', 'investment', 'enterprise ai',
  ]

  for (const kw of criticalValue) {
    if (text.includes(kw)) score += 5
  }
  for (const kw of highValue) {
    if (text.includes(kw)) score += 3
  }
  for (const kw of mediumValue) {
    if (text.includes(kw)) score += 1
  }

  // Bonus for matching multiple companies
  const matchedCompanies = matchCompanies(`${item.title} ${item.snippet}`)
  score += Math.min(matchedCompanies.length * 2, 10)

  // Penalize very short snippets (likely low quality)
  if (item.snippet.length < 50) score -= 3

  // Bonus for recent date mentions
  if (text.includes('2026') || text.includes('today') || text.includes('just')) score += 2

  return score
}

/** Core news fetching logic — shared between GET and cron */
export async function fetchNewsFromWeb(maxQueries?: number): Promise<any[]> {
  const numQueries = maxQueries || 16
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ZAI = require('z-ai-web-dev-sdk').default
  const zai = await ZAI.create()

  const allResults: any[] = []

  // Search queries in batches of 4 (parallel) — improved from batches of 4
  const batches: string[][] = []
  for (let i = 0; i < Math.min(numQueries, NEWS_SEARCH_QUERIES.length); i += 4) {
    batches.push(NEWS_SEARCH_QUERIES.slice(i, i + 4))
  }

  for (const batch of batches) {
    const promises = batch.map(async (query) => {
      try {
        const results = await zai.functions.invoke('web_search', { query, num: 8 })
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

  // Score and categorize
  const scored = unique.map(item => {
    const title = item.title
    const snippet = item.snippet
    const relevanceScore = scoreRelevance(item)
    const category = categorizeNews(item)
    const matchedCompanies = matchCompanies(`${title} ${snippet}`).map(c => ({
      id: c.id,
      name: c.name,
      logo: c.logo,
      region: c.region,
      category: c.category,
    }))

    return {
      ...item,
      relevanceScore,
      category,
      matchedCompanies,
    }
  })

  scored.sort((a, b) => b.relevanceScore - a.relevanceScore)

  // Filter out low-relevance items (increased threshold)
  const filtered = scored.filter(item => item.relevanceScore >= 1)

  return filtered.slice(0, 50) // Increased from 30 to 50
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('refresh') === 'true'
    const companyFilter = searchParams.get('company') || ''
    const categoryFilter = searchParams.get('category') || ''
    const limit = parseInt(searchParams.get('limit') || '30')
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
      if (categoryFilter) {
        results = results.filter(n => n.category === categoryFilter)
      }
      return NextResponse.json({
        news: results.slice((page - 1) * limit, page * limit),
        total: results.length,
        cached: true,
        fetchedAt: new Date(lastFetch).toISOString(),
        companies: AI_COMPANIES.map(c => ({ id: c.id, name: c.name, logo: c.logo, region: c.region, category: c.category })),
        categories: [...new Set(cachedNews.map(n => n.category).filter(Boolean))],
      })
    }

    // Fetch fresh news — increased from 8 to 16 queries
    const freshNews = await fetchNewsFromWeb(16)

    // Save new items to database
    let savedCount = 0
    for (const item of freshNews) {
      try {
        const existing = await db.communityPost.findFirst({
          where: { sourceUrl: item.url },
        })
        if (existing) continue

        const companyNames = item.matchedCompanies?.map((c: any) => c.name) || []
        const tags = ['AI News', 'Auto-Published', item.category || 'General']
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
            featured: item.relevanceScore >= 8,
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
    if (categoryFilter) {
      results = results.filter(n => n.category === categoryFilter)
    }

    return NextResponse.json({
      news: results.slice((page - 1) * limit, page * limit),
      total: results.length,
      cached: false,
      fetchedAt: new Date().toISOString(),
      savedNew: savedCount,
      totalStored: await db.communityPost.count({ where: { type: 'news' } }),
      companies: AI_COMPANIES.map(c => ({ id: c.id, name: c.name, logo: c.logo, region: c.region, category: c.category })),
      categories: [...new Set(freshNews.map(n => n.category).filter(Boolean))],
    })
  } catch (error) {
    console.error('News fetch error:', error)

    // Fallback: return stored news from DB
    try {
      const storedNews = await db.communityPost.findMany({
        where: { type: 'news' },
        orderBy: { createdAt: 'desc' },
        take: 30,
      })

      const processedNews = storedNews.map(n => {
        const title = n.title
        const content = n.content || ''
        return {
          id: n.id,
          title,
          snippet: content,
          url: n.sourceUrl,
          hostName: n.sourceName,
          date: n.createdAt,
          relevanceScore: 0,
          category: categorizeNews({ title, snippet: content }),
          matchedCompanies: matchCompanies(`${title} ${content}`).map(c => ({
            id: c.id, name: c.name, logo: c.logo, region: c.region, category: c.category,
          })),
        }
      })

      return NextResponse.json({
        news: processedNews,
        cached: true,
        fallback: true,
        total: storedNews.length,
        companies: AI_COMPANIES.map(c => ({ id: c.id, name: c.name, logo: c.logo, region: c.region, category: c.category })),
        categories: [...new Set(processedNews.map(n => n.category).filter(Boolean))],
      })
    } catch {
      return NextResponse.json(
        { error: 'Failed to fetch news', news: [], total: 0 },
        { status: 500 }
      )
    }
  }
}
