import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Community Portal Seeding API
 * POST /api/community/seed — Initialize portal with starter posts and welcome pinned post
 * Only runs if no featured posts exist yet.
 */
const STARTER_POSTS = [
  {
    type: 'news',
    title: 'DeepSeek R1 Shakes Up AI Industry with Open-Source Reasoning Model',
    content: 'DeepSeek released R1, an open-source reasoning model rivaling OpenAI o1 on math and coding benchmarks. Available for commercial use. Trained with reinforcement learning, the model excels at chain-of-thought reasoning.\n\n#AI #OpenSource #Reasoning\nhttps://deepseek.com',
    author: 'THEONEWAYGDA_AI',
    authorName: 'AI News Bot',
    sourceUrl: 'https://deepseek.com',
    sourceName: 'DeepSeek',
    tags: JSON.stringify(['AI', 'Auto-Published', 'Community', 'Foundation Models', 'DeepSeek']),
    featured: true,
  },
  {
    type: 'news',
    title: 'OpenAI Launches Operator: AI Agents That Browse the Web for You',
    content: 'OpenAI introduced Operator, a new AI agent that can autonomously browse websites, fill forms, and complete tasks. Built on GPT-4o, it represents a major step toward practical AI agents.\n\n#AI #AIAgents #Innovation\nhttps://openai.com/operator',
    author: 'THEONEWAYGDA_AI',
    authorName: 'AI News Bot',
    sourceUrl: 'https://openai.com',
    sourceName: 'OpenAI',
    tags: JSON.stringify(['AI', 'Auto-Published', 'Community', 'AI Agents', 'OpenAI']),
    featured: true,
  },
  {
    type: 'news',
    title: 'Google DeepMind AlphaFold 3 Predicts Structure of All Life Molecules',
    content: 'AlphaFold 3 extends beyond proteins to predict structures of DNA, RNA, and ligands. Published in Nature, it is the most accurate biomolecular structure predictor to date.\n\n#Research #Science #AI\nhttps://deepmind.google/alphafold',
    author: 'THEONEWAYGDA_AI',
    authorName: 'AI News Bot',
    sourceUrl: 'https://deepmind.google',
    sourceName: 'Google DeepMind',
    tags: JSON.stringify(['Research', 'Auto-Published', 'Community', 'AI Research']),
    featured: true,
  },
  {
    type: 'news',
    title: 'Cursor AI Raises $400M, Valued at $2.6B for AI-First Code Editor',
    content: 'Cursor, the AI-first code editor, closed a massive Series B round. Their AI coding assistant now supports multi-file editing and autonomous code generation.\n\n#Innovation #DevTools #Funding\nhttps://cursor.com',
    author: 'THEONEWAYGDA_AI',
    authorName: 'AI News Bot',
    sourceUrl: 'https://cursor.com',
    sourceName: 'TechCrunch',
    tags: JSON.stringify(['Innovation', 'Auto-Published', 'Community', 'AI Developer Tools', 'Funding']),
    featured: true,
  },
  {
    type: 'news',
    title: 'Meta Releases Llama 4: Most Capable Open-Source Model Yet',
    content: 'Meta unveiled Llama 4 with improved reasoning, multilingual support, and 128K context window. Available in multiple sizes for diverse deployment needs.\n\n#AI #OpenSource #LLM\nhttps://ai.meta.com/llama',
    author: 'THEONEWAYGDA_AI',
    authorName: 'AI News Bot',
    sourceUrl: 'https://ai.meta.com',
    sourceName: 'Meta AI',
    tags: JSON.stringify(['AI', 'Auto-Published', 'Community', 'Foundation Models', 'Meta']),
    featured: true,
  },
  {
    type: 'news',
    title: 'Kling AI Video Generator Goes Global — China Answer to Sora',
    content: 'Kuaishou Kling AI video generator now available worldwide. Generates realistic 1080p videos from text prompts, competing directly with OpenAI Sora and Runway Gen-3.\n\n#AI #AIVideo #ChinaAI\nhttps://kling.ai',
    author: 'THEONEWAYGDA_AI',
    authorName: 'AI News Bot',
    sourceUrl: 'https://kling.ai',
    sourceName: 'Kuaishou',
    tags: JSON.stringify(['AI', 'Auto-Published', 'Community', 'AI Video']),
    featured: true,
  },
  {
    type: 'news',
    title: 'Anthropic Claude 4 Achieves New SOTA on Coding Benchmarks',
    content: 'Anthropic Claude 4 sets new records on SWE-bench and HumanEval coding benchmarks. With enhanced computer use capabilities, it can autonomously navigate development environments.\n\n#AI #Benchmark #DevTools\nhttps://anthropic.com/claude',
    author: 'THEONEWAYGDA_AI',
    authorName: 'AI News Bot',
    sourceUrl: 'https://anthropic.com',
    sourceName: 'Anthropic',
    tags: JSON.stringify(['AI', 'Auto-Published', 'Community', 'Foundation Models']),
    featured: false,
  },
  {
    type: 'news',
    title: 'India AI Mission: $1.25B Investment to Build Sovereign AI Infrastructure',
    content: 'India approved a $1.25 billion AI mission to develop domestic computing capacity, datasets, and AI applications. Targets healthcare, agriculture, and education.\n\n#Innovation #IndiaAI #Funding\nhttps://meity.gov.in/ai',
    author: 'THEONEWAYGDA_AI',
    authorName: 'AI News Bot',
    sourceUrl: 'https://meity.gov.in',
    sourceName: 'MeitY India',
    tags: JSON.stringify(['Innovation', 'Auto-Published', 'Community', 'Funding']),
    featured: false,
  },
]

const WELCOME_POST = {
  type: 'community',
  title: 'Welcome to AI News & Community',
  content: 'Welcome to the AI News & Community portal on THEONEWAYGDA.\n\nThis is your hub for the latest AI news, research breakthroughs, and innovation updates. Here is how to get started:\n\nPost & Share: Create posts about AI tools, research papers, or innovations you discover. Add links and images.\n\nInteract: Like, comment, repost, and save posts that interest you.\n\nFollow Topics: Track specific areas like #AI, #Research, #Innovation, or niche topics like #AIAgents, #DevTools.\n\nCategories: Posts are classified as AI, Research, or Innovation for easy discovery.\n\nStay Updated: Our AI bot scans trusted sources hourly and publishes the most important news automatically.\n\nCommunity Rules: Be respectful, no spam, no misinformation. Focus on quality content that helps the community learn and grow.\n\nHappy posting!',
  author: 'THEONEWAYGDA',
  authorName: 'THEONEWAYGDA Team',
  tags: JSON.stringify(['Welcome', 'Community', 'AI', 'Research', 'Innovation']),
  featured: true,
}

export async function POST() {
  try {
    // Check if already seeded (has featured posts)
    const existingFeatured = await db.communityPost.count({
      where: { featured: true },
    })

    if (existingFeatured > 5) {
      return NextResponse.json({
        success: true,
        message: 'Portal already seeded',
        existingPosts: existingFeatured,
      })
    }

    let created = 0

    // Create welcome post first
    try {
      const existingWelcome = await db.communityPost.findFirst({
        where: { title: WELCOME_POST.title },
      })
      if (!existingWelcome) {
        await db.communityPost.create({ data: WELCOME_POST })
        created++
      }
    } catch (err) {
      console.error('[Seed] Error creating welcome post:', err)
    }

    // Create starter posts
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
      message: `Portal seeded with ${created} posts`,
      postsCreated: created,
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
  const newsCount = await db.communityPost.count({ where: { type: 'news' } })
  const communityCount = await db.communityPost.count({ where: { type: 'community' } })

  return NextResponse.json({
    totalPosts: count,
    featuredPosts: featured,
    newsPosts: newsCount,
    communityPosts: communityCount,
    seeded: featured > 3,
  })
}
