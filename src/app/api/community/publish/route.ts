import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { fetchNewsFromWeb } from '@/app/api/community/news/route'

/**
 * AI News & Community Auto-Publisher — Always-On Engine
 *
 * Core rules:
 * - Hourly cycle: search trusted sources, select top 3-5 items, publish micro posts (≤280 chars)
 * - 48-hour dedup: avoid repeating same story within 48h
 * - Category balance: maintain diversity across AI, Research, Innovation
 * - Evergreen fallback: ensure at least 1 post every 2 hours even if news flow is low
 * - Exponential backoff on error with structured logging
 *
 * Output format per post:
 * { type: "auto", category: "AI"|"Research"|"Innovation", text, source_url, hashtags, author: "THEONEWAYGDA_AI", timestamp }
 *
 * Called by Vercel Cron hourly.
 * Trigger: GET /api/community/publish?shift=0
 * Startup (initial seeding): GET /api/community/publish?startup=true
 * Manual trigger: GET /api/community/publish?manual=true
 */

// ─── Category classification ───

function classifyCategory(newsCategory: string): 'AI' | 'Research' | 'Innovation' {
  const mapping: Record<string, 'AI' | 'Research' | 'Innovation'> = {
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

// ─── Hashtag generation ───

function generateHashtags(title: string, snippet: string, category: 'AI' | 'Research' | 'Innovation', companies: string[]): string[] {
  const text = `${title} ${snippet}`.toLowerCase()
  const baseHashtags: Record<string, string[]> = {
    'AI': ['#AI'],
    'Research': ['#Research'],
    'Innovation': ['#Innovation'],
  }

  const hashtags = [...(baseHashtags[category] || ['#AI'])]

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
  if (text.includes('paper') || text.includes('arxiv') || text.includes('publication')) hashtags.push('#Paper')
  if (text.includes('breakthrough') || text.includes('discovery')) hashtags.push('#Breakthrough')
  if (text.includes('startup') || text.includes('funding') || text.includes('investment')) hashtags.push('#Funding')

  if (companies.length > 0) {
    const companyHashtag = '#' + companies[0].replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '')
    if (companyHashtag.length <= 20 && !hashtags.includes(companyHashtag)) {
      hashtags.push(companyHashtag)
    }
  }

  return [...new Set(hashtags)].slice(0, 3)
}

// ─── Micro post formatting (≤280 chars) ───

function formatMicroPost(title: string, snippet: string, url: string, category: 'AI' | 'Research' | 'Innovation', companies: string[]): {
  headline: string
  content: string
  hashtags: string[]
  fullText: string
} {
  let headline = title.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim()
  if (headline.length > 100) headline = headline.slice(0, 97) + '...'

  let facts = snippet.replace(/<[^>]*>/g, '').trim()
  if (facts.length > 120) facts = facts.slice(0, 117) + '...'

  const hashtags = generateHashtags(title, snippet, category, companies)

  let fullText = `${headline}\n${facts}\n\n${hashtags.join(' ')}`
  if (url && fullText.length + url.length + 1 < 300) {
    fullText += `\n${url}`
  }
  if (fullText.length > 280) {
    fullText = fullText.slice(0, 277) + '...'
  }

  return { headline, content: facts, hashtags, fullText }
}

// ─── 48-hour dedup check ───

async function getRecentTitles(hours: number = 48): Promise<string[]> {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)
  const recentPosts = await db.communityPost.findMany({
    where: {
      createdAt: { gte: cutoff },
      author: 'THEONEWAYGDA_AI',
    },
    select: { title: true },
  })
  return recentPosts.map(p => p.title.toLowerCase())
}

function isDuplicate(title: string, recentTitles: string[]): boolean {
  const normalized = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
  for (const existing of recentTitles) {
    const existingNorm = existing.replace(/[^a-z0-9\s]/g, '').trim()
    // Exact match or high overlap (>70% word overlap)
    if (normalized === existingNorm) return true
    const normWords = new Set(normalized.split(/\s+/))
    const existWords = new Set(existingNorm.split(/\s+/))
    if (normWords.size > 0 && existWords.size > 0) {
      const overlap = [...normWords].filter(w => existWords.has(w)).length
      if (overlap / Math.max(normWords.size, existWords.size) > 0.7) return true
    }
  }
  return false
}

// ─── Evergreen fallback content ───

const EVERGREEN_POSTS: { category: 'AI' | 'Research' | 'Innovation'; title: string; content: string; url: string; hashtags: string[] }[] = [
  {
    category: 'AI',
    title: 'Open-Source AI Models Continue to Close the Gap with Proprietary Systems',
    content: 'Open-weight LLMs from Meta, DeepSeek, Mistral and Qwen are closing performance gaps with GPT-4 and Claude across benchmarks. Community fine-tuning and quantization are making these models accessible on consumer hardware.',
    url: 'https://huggingface.co/models',
    hashtags: ['#AI', '#OpenSource', '#LLM'],
  },
  {
    category: 'Research',
    title: 'AI-Assisted Scientific Discovery Is Accelerating Research Across Disciplines',
    content: 'From AlphaFold predicting protein structures to AI-designed materials and drug discovery pipelines, AI is transforming how science is done. Nature and Science report record AI co-authored papers in 2025-2026.',
    url: 'https://www.nature.com',
    hashtags: ['#Research', '#Science', '#AI'],
  },
  {
    category: 'Innovation',
    title: 'AI Coding Assistants Are Reshaping Software Development Workflows',
    content: 'Tools like Cursor, GitHub Copilot, and Windsurf are enabling 2-5x productivity gains. AI agents can now autonomously debug, refactor, and generate full features. The future of coding is AI-augmented.',
    url: 'https://cursor.com',
    hashtags: ['#Innovation', '#DevTools', '#AIAgents'],
  },
  {
    category: 'AI',
    title: 'Multimodal AI Models Are Becoming the New Standard',
    content: 'GPT-4o, Gemini 2, Claude 4 and Qwen-VL now natively handle text, images, audio and video in a single model. This convergence is enabling new applications in accessibility, creative tools and autonomous agents.',
    url: 'https://openai.com',
    hashtags: ['#AI', '#Multimodal', '#LLM'],
  },
  {
    category: 'Research',
    title: 'Chain-of-Thought Reasoning Models Achieve New Breakthroughs in Math and Logic',
    content: 'DeepSeek R1, OpenAI o3, and Gemini Thinking models demonstrate that extended reasoning traces dramatically improve performance on mathematical proofs, logical puzzles, and complex multi-step problems.',
    url: 'https://arxiv.org',
    hashtags: ['#Research', '#Reasoning', '#AI'],
  },
  {
    category: 'Innovation',
    title: 'AI Video Generation Reaches Photorealistic Quality at Scale',
    content: 'Kling, Sora, Runway Gen-4 and Hailuo produce cinematic-quality videos from text prompts. Real-time video generation is becoming viable, opening doors for personalized content creation and filmmaking.',
    url: 'https://kling.ai',
    hashtags: ['#Innovation', '#AIVideo', '#CreativeAI'],
  },
  {
    category: 'AI',
    title: 'The Race for AI Hardware: New Chips Push Inference Speed and Efficiency',
    content: 'NVIDIA Blackwell, AMD MI350, Google TPU v6 and custom silicon from hyperscalers are dramatically reducing AI inference costs. Edge AI chips are bringing capable models to mobile and IoT devices.',
    url: 'https://nvidia.com',
    hashtags: ['#AI', '#AIHardware', '#Inference'],
  },
  {
    category: 'Research',
    title: 'RAG and Retrieval-Augmented Methods Improve AI Accuracy Without Retraining',
    content: 'Retrieval-Augmented Generation continues to evolve with better chunking strategies, hybrid search, and reranking models. RAG-based approaches reduce hallucination by 40-60% compared to pure LLM outputs.',
    url: 'https://arxiv.org',
    hashtags: ['#Research', '#RAG', '#AIAccuracy'],
  },
  {
    category: 'Innovation',
    title: 'Asia Emerges as a Global Powerhouse in AI Innovation and Deployment',
    content: 'China, India, Japan, South Korea and Singapore are investing billions in AI. Companies like DeepSeek, Alibaba, and Kuaishou are producing world-class models. Asia is setting the pace in applied AI.',
    url: 'https://theonewaygda.com',
    hashtags: ['#Innovation', '#AsiaAI', '#GlobalTech'],
  },
  {
    category: 'AI',
    title: 'AI Agents Are Moving from Prototypes to Production-Grade Systems',
    content: 'Autonomous AI agents for customer support, data analysis, and software engineering are being deployed at scale. CrewAI, LangGraph, and custom agent frameworks are making multi-step AI workflows reliable.',
    url: 'https://langchain.com',
    hashtags: ['#AI', '#AIAgents', '#Automation'],
  },
]

// ─── Category-balanced selection ───

function selectBalancedTopItems(items: Array<{
  title: string
  snippet: string
  url: string
  hostName: string
  category: string
  relevanceScore: number
  matchedCompanies: any[]
}>, recentTitles: string[], maxItems: number = 5): typeof items {
  const classified = items
    .filter(item => !isDuplicate(item.title, recentTitles))
    .map(item => ({
      ...item,
      mainCategory: classifyCategory(item.category) as 'AI' | 'Research' | 'Innovation',
    }))

  // Group by category
  const buckets: Record<string, typeof classified> = { AI: [], Research: [], Innovation: [] }
  for (const item of classified) {
    buckets[item.mainCategory].push(item)
  }

  // Sort each bucket by relevance
  for (const key of Object.keys(buckets)) {
    buckets[key].sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  // Select at least 1 from each category, then fill by relevance
  const selected: typeof classified = []
  const categories = Object.keys(buckets) as ('AI' | 'Research' | 'Innovation')[]

  // Round 1: take top 1 from each non-empty category
  for (const cat of categories) {
    if (buckets[cat].length > 0) {
      selected.push(buckets[cat].shift()!)
    }
  }

  // Round 2: fill remaining slots by highest relevance across all categories
  const remaining = [...buckets.AI, ...buckets.Research, ...buckets.Innovation]
  remaining.sort((a, b) => b.relevanceScore - a.relevanceScore)

  while (selected.length < maxItems && remaining.length > 0) {
    selected.push(remaining.shift()!)
  }

  return selected
}

// ─── Exponential backoff retry ───

async function withRetry<T>(fn: () => Promise<T>, maxRetries: number = 3, label: string = 'operation'): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      const delay = Math.min(1000 * Math.pow(2, attempt), 30000) // 1s, 2s, 4s... max 30s
      const isLast = attempt === maxRetries
      console.error(`[Publisher] ${label} attempt ${attempt + 1}/${maxRetries + 1} failed${isLast ? ' — giving up' : ` — retrying in ${delay}ms`}:`, error)
      if (isLast) throw error
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error(`${label} failed after ${maxRetries + 1} attempts`)
}

// ─── Main handler ───

export async function GET(request: Request) {
  const startTime = Date.now()
  let fetched = 0
  let published = 0
  let skipped = 0
  let evergreenUsed = 0

  try {
    const { searchParams } = new URL(request.url)
    const shift = searchParams.get('shift') || '0'
    const isStartup = searchParams.get('startup') === 'true'
    const isManual = searchParams.get('manual') === 'true'
    const maxPosts = parseInt(searchParams.get('max') || '5')

    console.log(`[Publisher] Starting auto-publish at ${new Date().toISOString()} (shift: ${shift}, startup: ${isStartup}, manual: ${isManual})`)

    // ─── 1. Fetch recent titles for 48h dedup ───
    const recentTitles = await withRetry(
      () => getRecentTitles(48),
      2,
      'fetch-recent-titles'
    )

    // ─── 2. Fetch fresh news ───
    const numQueries = isStartup ? 24 : 12
    const newsItems = await withRetry(
      () => fetchNewsFromWeb(numQueries),
      3,
      'fetch-news-from-web'
    )
    fetched = newsItems.length

    // ─── 3. Select top 3-5 balanced items, deduped ───
    const topItems = selectBalancedTopItems(newsItems, recentTitles, maxPosts)

    // ─── 4. Publish selected items ───
    for (const item of topItems) {
      try {
        // Double-check URL dedup
        const existingByUrl = await db.communityPost.findFirst({
          where: { sourceUrl: item.url },
        })
        if (existingByUrl) {
          skipped++
          continue
        }

        const mainCategory = classifyCategory(item.category)
        const companyNames = (item.matchedCompanies || []).map((c: any) => c.name)

        const microPost = formatMicroPost(
          item.title,
          item.snippet,
          item.url,
          mainCategory,
          companyNames,
        )

        const tags = [mainCategory, 'Auto-Published', 'Community']
        if (item.category && item.category !== 'AI News') tags.push(item.category)
        if (companyNames.length > 0) tags.push(...companyNames.slice(0, 3))
        tags.push(...microPost.hashtags.map(h => h.replace('#', '')))

        await db.communityPost.create({
          data: {
            type: 'auto',
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

    // ─── 5. Evergreen fallback: if no new items published, check if we need one ───
    if (published === 0) {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000)
      const recentAutoPost = await db.communityPost.findFirst({
        where: {
          author: 'THEONEWAYGDA_AI',
          createdAt: { gte: twoHoursAgo },
        },
      })

      if (!recentAutoPost) {
        // No auto-post in last 2 hours — use evergreen content
        const rotatedIndex = Math.floor(Date.now() / (2 * 60 * 60 * 1000)) % EVERGREEN_POSTS.length
        const evergreen = EVERGREEN_POSTS[rotatedIndex]

        // Check if this evergreen was posted in last 48h
        if (!isDuplicate(evergreen.title, recentTitles)) {
          await db.communityPost.create({
            data: {
              type: 'auto',
              title: evergreen.title,
              content: `${evergreen.content}\n\n${evergreen.hashtags.join(' ')}\n${evergreen.url}`,
              author: 'THEONEWAYGDA_AI',
              authorName: 'AI News Bot',
              sourceUrl: evergreen.url,
              tags: JSON.stringify([evergreen.category, 'Auto-Published', 'Community', 'Evergreen', ...evergreen.hashtags.map(h => h.replace('#', ''))]),
              featured: false,
            },
          })
          published++
          evergreenUsed++
          console.log(`[Publisher] Published evergreen fallback: "${evergreen.title.slice(0, 60)}..."`)
        }
      }
    }

    const duration = Date.now() - startTime
    console.log(`[Publisher] Completed: ${fetched} fetched, ${published} published (${evergreenUsed} evergreen), ${skipped} skipped in ${duration}ms`)

    // ─── 6. Update cron job status ───
    await withRetry(
      async () => {
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
      },
      2,
      'update-cron-status'
    )

    return NextResponse.json({
      success: true,
      message: `Auto-publish completed`,
      stats: {
        fetched,
        published,
        evergreen: evergreenUsed,
        skipped,
        duration: `${duration}ms`,
        shift,
        isStartup,
        isManual,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const duration = Date.now() - startTime
    console.error(`[Publisher] Fatal error after ${duration}ms:`, message)

    // Update cron status as failed
    try {
      await db.cronJob.upsert({
        where: { name: 'community-publisher' },
        create: {
          name: 'community-publisher',
          type: 'news',
          interval: '1h',
          status: 'failed',
          lastRun: new Date(),
          runCount: 1,
          lastError: message.substring(0, 500),
          nextRun: new Date(Date.now() + 60 * 60 * 1000),
        },
        update: {
          status: 'failed',
          lastRun: new Date(),
          lastError: message.substring(0, 500),
        },
      })
    } catch { /* ignore */ }

    return NextResponse.json({
      success: false,
      error: message,
      stats: { fetched, published, evergreen: evergreenUsed, skipped, duration: `${duration}ms` },
    }, { status: 500 })
  }
}
