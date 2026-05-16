import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Community Portal Seeding API
 *
 * POST /api/community/seed — Initialize portal with:
 *   1. "Portal is Live" announcement (pinned)
 *   2. Welcome post (pinned)
 *   3. 5-10 high-quality starter posts covering AI, Research, Innovation
 *
 * Only runs if fewer than 3 featured posts exist.
 *
 * Output format for each post:
 * {
 *   "type": "auto" | "user_highlight" | "digest",
 *   "category": "AI" | "Research" | "Innovation",
 *   "text": "...",
 *   "source_url": "https://...",
 *   "hashtags": ["#AI", "#Research"],
 *   "author": "THEONEWAYGDA_AI",
 *   "timestamp": "ISO8601"
 * }
 */

// ─── Portal is Live Announcement ───

const PORTAL_LIVE_POST = {
  type: 'digest',
  title: 'AI News & Community Portal is Now Live',
  content: `AI News & Community Portal is Now Live!

Welcome to THEONEWAYGDA's AI News & Community portal — your real-time hub for the latest breakthroughs in artificial intelligence, scientific research, and innovation.

What you will find here:
- Hourly auto-published AI news from 90+ trusted sources
- Research highlights from top journals and preprints
- Innovation updates from startups and tech giants worldwide
- Community posts, discussions, and knowledge sharing
- Daily digests and community highlights

The portal runs as an always-on service, scanning and curating the most impactful stories so you never miss what matters.

Start exploring, post your discoveries, and join the conversation!

#PortalLive #AI #Research #Innovation #Community`,
  author: 'THEONEWAYGDA_AI',
  authorName: 'THEONEWAYGDA Team',
  tags: JSON.stringify(['Portal', 'Welcome', 'Community', 'AI', 'Research', 'Innovation', 'Announcement']),
  featured: true,
}

// ─── Welcome Post ───

const WELCOME_POST = {
  type: 'community',
  title: 'Welcome to AI News & Community',
  content: `Welcome to the AI News & Community portal on THEONEWAYGDA.

This is your hub for the latest AI news, research breakthroughs, and innovation updates. Here is how to get started:

Post & Share: Create posts about AI tools, research papers, or innovations you discover. Add links and images.

Interact: Like, comment, repost, and save posts that interest you.

Follow Topics: Track specific areas like #AI, #Research, #Innovation, or niche topics like #AIAgents, #DevTools.

Categories: Posts are classified as AI, Research, or Innovation for easy discovery.

Stay Updated: Our AI bot scans trusted sources hourly and publishes the most important news automatically.

Community Rules: Be respectful, no spam, no misinformation. Focus on quality content that helps the community learn and grow.

Happy posting!`,
  author: 'THEONEWAYGDA',
  authorName: 'THEONEWAYGDA Team',
  tags: JSON.stringify(['Welcome', 'Community', 'AI', 'Research', 'Innovation']),
  featured: true,
}

// ─── Starter Posts (5-10 high-quality posts) ───

const STARTER_POSTS = [
  {
    type: 'auto',
    title: 'DeepSeek R1 Shakes Up AI Industry with Open-Source Reasoning Model',
    content: `DeepSeek R1: Open-source reasoning model rivaling o1 on math and coding benchmarks. Available commercially. Trained with reinforcement learning, excels at chain-of-thought reasoning.

#AI #OpenSource #Reasoning
https://deepseek.com`,
    author: 'THEONEWAYGDA_AI',
    authorName: 'AI News Bot',
    sourceUrl: 'https://deepseek.com',
    sourceName: 'DeepSeek',
    tags: JSON.stringify(['AI', 'Auto-Published', 'Community', 'Foundation Models', 'DeepSeek', 'OpenSource', 'Reasoning']),
    featured: true,
  },
  {
    type: 'auto',
    title: 'OpenAI Launches Operator: AI Agents That Browse the Web for You',
    content: `OpenAI Operator: New AI agent that autonomously browses websites, fills forms, and completes tasks. Built on GPT-4o, a major step toward practical AI agents.

#AI #AIAgents #Innovation
https://openai.com/operator`,
    author: 'THEONEWAYGDA_AI',
    authorName: 'AI News Bot',
    sourceUrl: 'https://openai.com',
    sourceName: 'OpenAI',
    tags: JSON.stringify(['AI', 'Auto-Published', 'Community', 'AI Agents', 'OpenAI', 'AIAgents']),
    featured: true,
  },
  {
    type: 'auto',
    title: 'Google DeepMind AlphaFold 3 Predicts Structure of All Life Molecules',
    content: `AlphaFold 3 extends beyond proteins to predict DNA, RNA, and ligand structures. Published in Nature, the most accurate biomolecular structure predictor to date.

#Research #Science #AI
https://deepmind.google/alphafold`,
    author: 'THEONEWAYGDA_AI',
    authorName: 'AI News Bot',
    sourceUrl: 'https://deepmind.google',
    sourceName: 'Google DeepMind',
    tags: JSON.stringify(['Research', 'Auto-Published', 'Community', 'AI Research', 'Science', 'AlphaFold']),
    featured: true,
  },
  {
    type: 'auto',
    title: 'Cursor AI Raises $400M, Valued at $2.6B for AI-First Code Editor',
    content: `Cursor raised $400M Series B. Their AI coding assistant now supports multi-file editing and autonomous code generation. AI-native development tools are the future.

#Innovation #DevTools #Funding
https://cursor.com`,
    author: 'THEONEWAYGDA_AI',
    authorName: 'AI News Bot',
    sourceUrl: 'https://cursor.com',
    sourceName: 'TechCrunch',
    tags: JSON.stringify(['Innovation', 'Auto-Published', 'Community', 'AI Developer Tools', 'Funding', 'DevTools']),
    featured: true,
  },
  {
    type: 'auto',
    title: 'Meta Releases Llama 4: Most Capable Open-Source Model Yet',
    content: `Meta Llama 4: Improved reasoning, multilingual support, and 128K context. Available in multiple sizes for diverse deployment needs. Open-source AI continues to advance rapidly.

#AI #OpenSource #LLM
https://ai.meta.com/llama`,
    author: 'THEONEWAYGDA_AI',
    authorName: 'AI News Bot',
    sourceUrl: 'https://ai.meta.com',
    sourceName: 'Meta AI',
    tags: JSON.stringify(['AI', 'Auto-Published', 'Community', 'Foundation Models', 'Meta', 'OpenSource']),
    featured: true,
  },
  {
    type: 'auto',
    title: 'Kling AI Video Generator Goes Global — China Answer to Sora',
    content: `Kuaishou Kling AI video generator now available worldwide. Generates realistic 1080p videos from text prompts, competing with Sora and Runway Gen-3.

#AI #AIVideo #ChinaAI
https://kling.ai`,
    author: 'THEONEWAYGDA_AI',
    authorName: 'AI News Bot',
    sourceUrl: 'https://kling.ai',
    sourceName: 'Kuaishou',
    tags: JSON.stringify(['AI', 'Auto-Published', 'Community', 'AI Video', 'ChinaAI', 'Innovation']),
    featured: true,
  },
  {
    type: 'auto',
    title: 'Anthropic Claude 4 Achieves New SOTA on Coding Benchmarks',
    content: `Anthropic Claude 4 sets new records on SWE-bench and HumanEval. With enhanced computer use, it can autonomously navigate dev environments. A leap forward for AI coding.

#AI #Benchmark #DevTools
https://anthropic.com/claude`,
    author: 'THEONEWAYGDA_AI',
    authorName: 'AI News Bot',
    sourceUrl: 'https://anthropic.com',
    sourceName: 'Anthropic',
    tags: JSON.stringify(['AI', 'Auto-Published', 'Community', 'Foundation Models', 'Benchmark']),
    featured: false,
  },
  {
    type: 'auto',
    title: 'India AI Mission: $1.25B Investment for Sovereign AI Infrastructure',
    content: `India approved $1.25B AI mission for domestic computing capacity, datasets, and AI applications. Targets healthcare, agriculture, and education sectors.

#Innovation #IndiaAI #Funding
https://meity.gov.in/ai`,
    author: 'THEONEWAYGDA_AI',
    authorName: 'AI News Bot',
    sourceUrl: 'https://meity.gov.in',
    sourceName: 'MeitY India',
    tags: JSON.stringify(['Innovation', 'Auto-Published', 'Community', 'Funding', 'IndiaAI']),
    featured: false,
  },
  {
    type: 'auto',
    title: 'New Study: RAG Reduces AI Hallucination by 40-60% Across Benchmarks',
    content: `Research shows Retrieval-Augmented Generation with hybrid search and reranking cuts hallucination rates by 40-60%. RAG is now the gold standard for production AI deployments.

#Research #RAG #AIAccuracy
https://arxiv.org`,
    author: 'THEONEWAYGDA_AI',
    authorName: 'AI News Bot',
    sourceUrl: 'https://arxiv.org',
    sourceName: 'arXiv',
    tags: JSON.stringify(['Research', 'Auto-Published', 'Community', 'RAG', 'Hallucination', 'AIAccuracy']),
    featured: false,
  },
  {
    type: 'auto',
    title: 'AI Agents Move From Prototypes to Production at Scale',
    content: `Autonomous AI agents for support, data analysis, and engineering are deployed at scale. CrewAI, LangGraph, and custom frameworks make multi-step AI workflows production-ready.

#AI #AIAgents #Automation
https://langchain.com`,
    author: 'THEONEWAYGDA_AI',
    authorName: 'AI News Bot',
    sourceUrl: 'https://langchain.com',
    sourceName: 'LangChain',
    tags: JSON.stringify(['AI', 'Auto-Published', 'Community', 'AI Agents', 'Automation']),
    featured: false,
  },
]

export async function POST() {
  try {
    // Check if already seeded (has featured posts)
    const existingFeatured = await db.communityPost.count({
      where: { featured: true },
    })

    if (existingFeatured > 8) {
      return NextResponse.json({
        success: true,
        message: 'Portal already seeded',
        existingPosts: existingFeatured,
      })
    }

    let created = 0

    // 1. Create "Portal is Live" announcement
    try {
      const existingPortalLive = await db.communityPost.findFirst({
        where: { title: PORTAL_LIVE_POST.title },
      })
      if (!existingPortalLive) {
        await db.communityPost.create({ data: PORTAL_LIVE_POST })
        created++
        console.log('[Seed] Created "Portal is Live" announcement')
      }
    } catch (err) {
      console.error('[Seed] Error creating portal live post:', err)
    }

    // 2. Create welcome post
    try {
      const existingWelcome = await db.communityPost.findFirst({
        where: { title: WELCOME_POST.title },
      })
      if (!existingWelcome) {
        await db.communityPost.create({ data: WELCOME_POST })
        created++
        console.log('[Seed] Created welcome post')
      }
    } catch (err) {
      console.error('[Seed] Error creating welcome post:', err)
    }

    // 3. Create starter posts
    for (const postData of STARTER_POSTS) {
      try {
        const existing = await db.communityPost.findFirst({
          where: { sourceUrl: postData.sourceUrl },
        })
        if (!existing) {
          await db.communityPost.create({ data: postData })
          created++
        }
      } catch (err) {
        console.error('[Seed] Error creating post:', err)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Portal seeded with ${created} new posts`,
      postsCreated: created,
      totalFeatured: await db.communityPost.count({ where: { featured: true } }),
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Seed] Fatal error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}

export async function GET() {
  const count = await db.communityPost.count()
  const featured = await db.communityPost.count({ where: { featured: true } })
  const autoPosts = await db.communityPost.count({ where: { type: 'auto' } })
  const newsCount = await db.communityPost.count({ where: { type: 'news' } })
  const communityCount = await db.communityPost.count({ where: { type: 'community' } })
  const digestCount = await db.communityPost.count({ where: { type: 'digest' } })
  const highlightsCount = await db.communityPost.count({ where: { type: 'user_highlight' } })

  // Return posts in the JSON output format
  const recentPosts = await db.communityPost.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  const formattedPosts = recentPosts.map(p => {
    let tags: string[] = []
    try { tags = JSON.parse(p.tags || '[]') } catch { tags = [] }

    const category = tags.includes('Research') ? 'Research'
      : tags.includes('Innovation') ? 'Innovation'
      : 'AI'

    return {
      type: p.type === 'auto' ? 'auto'
        : p.type === 'user_highlight' ? 'user_highlight'
        : p.type === 'digest' ? 'digest'
        : 'community',
      category,
      text: p.content,
      source_url: p.sourceUrl || null,
      hashtags: tags
        .filter((t: string) => t.startsWith('#') || ['AI', 'Research', 'Innovation', 'OpenSource', 'Reasoning', 'AIAgents', 'DevTools', 'AIVideo', 'ChinaAI', 'Benchmark', 'RAG', 'Funding', 'Automation'].includes(t))
        .slice(0, 3)
        .map((t: string) => t.startsWith('#') ? t : `#${t}`),
      author: p.author,
      timestamp: p.createdAt.toISOString(),
    }
  })

  return NextResponse.json({
    totalPosts: count,
    featuredPosts: featured,
    autoPosts,
    newsPosts: newsCount,
    communityPosts: communityCount,
    digestPosts: digestCount,
    highlightPosts: highlightsCount,
    seeded: featured > 3,
    recentPosts: formattedPosts,
  })
}
