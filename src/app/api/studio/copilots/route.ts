import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/* ═══════════════════════════════════════════
   GET /api/studio/copilots — List copilots
   ═══════════════════════════════════════════ */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || 'all'
    const search = searchParams.get('search') || ''
    const featured = searchParams.get('featured') === 'true'
    const sort = searchParams.get('sort') || 'installs' // installs | rating | newest

    /* ── Seed sample data if DB is empty ── */
    const count = await db.customCopilot.count()
    if (count === 0) {
      await db.customCopilot.createMany({
        data: [
          {
            authorId: 'system@theonewaygda.com',
            authorName: 'TheOneWayGDA Team',
            name: 'BioData Analyst',
            description:
              'Specialized copilot for biological data analysis. Performs statistical tests on genomic data, interprets bioinformatics results, and generates publication-ready figures with proper annotations.',
            category: 'data_analyst',
            systemPrompt:
              'You are BioData Analyst, an expert AI assistant specializing in biological and biomedical data analysis. You help researchers analyze genomic datasets, perform statistical tests (t-tests, ANOVA, chi-square, survival analysis), interpret bioinformatics results, and create publication-quality visualizations. Always provide code snippets in R or Python when applicable.',
            avatarColor: '#22c55e',
            tags: JSON.stringify(['biology', 'genomics', 'statistics', 'biomedical', 'R', 'Python']),
            tools: JSON.stringify(['workspace', 'leaderboard']),
            pricing: 'free',
            rating: 4.8,
            ratingCount: 142,
            installCount: 2847,
            usageCount: 15230,
            forkCount: 89,
            isFeatured: true,
            isOfficial: true,
            version: '2.1.0',
          },
          {
            authorId: 'system@theonewaygda.com',
            authorName: 'TheOneWayGDA Team',
            name: 'Quantum ML Engineer',
            description:
              'Quantum machine learning assistant that helps design quantum circuits, optimize QML algorithms, and benchmark quantum-vs-classical model performance across datasets.',
            category: 'ml_engineer',
            systemPrompt:
              'You are Quantum ML Engineer, a specialized AI assistant for quantum machine learning. You help users design quantum circuits, implement QML algorithms (VQC, QGAN, quantum kernel methods), compare quantum vs classical performance, and select optimal quantum hardware. Provide implementations using PennyLane, Qiskit, or Cirq.',
            avatarColor: '#a855f7',
            tags: JSON.stringify(['quantum', 'machine-learning', 'QML', 'PennyLane', 'Qiskit']),
            tools: JSON.stringify(['workspace', 'leaderboard', 'community']),
            pricing: 'free',
            rating: 4.6,
            ratingCount: 98,
            installCount: 1563,
            usageCount: 8721,
            forkCount: 45,
            isFeatured: true,
            isOfficial: false,
            version: '1.3.0',
          },
          {
            authorId: 'sarah.chen@research.io',
            authorName: 'Dr. Sarah Chen',
            name: 'Legal Code Assistant',
            description:
              'AI assistant for legal professionals that analyzes code for compliance issues, generates privacy-preserving code patterns, and drafts technical legal documentation.',
            category: 'code_gen',
            systemPrompt:
              'You are Legal Code Assistant, an AI specializing in the intersection of software engineering and legal compliance. You review code for GDPR, CCPA, HIPAA, and SOC2 compliance, generate privacy-preserving code patterns, draft technical privacy policies, and help implement secure data handling. Always reference specific regulatory sections.',
            avatarColor: '#ef4444',
            tags: JSON.stringify(['legal', 'compliance', 'GDPR', 'privacy', 'security']),
            tools: JSON.stringify(['workspace']),
            pricing: 'paid',
            price: 9.99,
            rating: 4.5,
            ratingCount: 67,
            installCount: 892,
            usageCount: 5430,
            forkCount: 23,
            isFeatured: false,
            isOfficial: false,
            version: '1.7.0',
          },
          {
            authorId: 'marcus.stats@academia.edu',
            authorName: 'Prof. Marcus Williams',
            name: 'StatWizard Pro',
            description:
              'Advanced statistical analysis copilot with expertise in Bayesian methods, multivariate analysis, and clinical trial statistics. Generates R/Python code with detailed explanations.',
            category: 'statistician',
            systemPrompt:
              'You are StatWizard Pro, an advanced statistical analysis assistant. You specialize in Bayesian inference, multivariate analysis (PCA, factor analysis, MANOVA), clinical trial statistics (power analysis, survival models), and mixed-effects models. Always provide step-by-step mathematical derivations and production-ready R or Python code.',
            avatarColor: '#3b82f6',
            tags: JSON.stringify(['statistics', 'Bayesian', 'clinical-trials', 'R', 'multivariate']),
            tools: JSON.stringify(['workspace', 'leaderboard', 'community']),
            pricing: 'free',
            rating: 4.9,
            ratingCount: 234,
            installCount: 4201,
            usageCount: 28450,
            forkCount: 156,
            isFeatured: true,
            isOfficial: true,
            version: '3.0.1',
          },
          {
            authorId: 'elena.r@techcorp.com',
            authorName: 'Elena Rodriguez',
            name: 'ReportForge AI',
            description:
              'Automated report generation copilot that creates executive summaries, data-driven insights, and beautifully formatted PDF/HTML reports from raw data.',
            category: 'report_writer',
            systemPrompt:
              'You are ReportForge AI, an automated report generation assistant. You transform raw data into executive summaries, create data-driven narrative reports, design professional charts and visualizations, and generate publication-ready PDF/HTML output. You adapt your tone for C-suite, technical, or general audiences.',
            avatarColor: '#f59e0b',
            tags: JSON.stringify(['reports', 'automation', 'visualization', 'executive', 'PDF']),
            tools: JSON.stringify(['workspace', 'leaderboard']),
            pricing: 'free',
            rating: 4.3,
            ratingCount: 89,
            installCount: 1234,
            usageCount: 6789,
            forkCount: 34,
            isFeatured: false,
            isOfficial: false,
            version: '1.5.2',
          },
          {
            authorId: 'creative.ai@studio.co',
            authorName: 'Creative AI Lab',
            name: 'StoryWeaver',
            description:
              'Creative writing copilot for generating narratives, worldbuilding, character development, and interactive story design. Supports multiple genres and writing styles.',
            category: 'creative',
            systemPrompt:
              'You are StoryWeaver, a creative writing assistant specialized in narrative generation. You help with worldbuilding, character development arcs, dialogue writing, plot structuring, and interactive story design. You can write in any genre (sci-fi, fantasy, thriller, romance, literary fiction) and adapt to any requested style or tone.',
            avatarColor: '#ec4899',
            tags: JSON.stringify(['creative-writing', 'storytelling', 'worldbuilding', 'narrative']),
            tools: JSON.stringify(['workspace', 'community']),
            pricing: 'free',
            rating: 4.4,
            ratingCount: 156,
            installCount: 2156,
            usageCount: 12340,
            forkCount: 78,
            isFeatured: false,
            isOfficial: false,
            version: '1.2.0',
          },
          {
            authorId: 'neural.consult@deepai.com',
            authorName: 'Neural Consultancy',
            name: 'FinRisk Analyst',
            description:
              'Domain expert copilot for financial risk analysis, portfolio optimization, and market modeling. Provides quantitative finance insights with VaR, Monte Carlo, and stress testing.',
            category: 'domain_expert',
            systemPrompt:
              'You are FinRisk Analyst, a domain expert in financial risk analysis and quantitative finance. You perform Value-at-Risk calculations, Monte Carlo simulations, portfolio optimization (Markowitz, Black-Litterman), stress testing, and market risk modeling. Provide Excel formulas, Python/R code, and clear explanations of financial concepts.',
            avatarColor: '#14b8a6',
            tags: JSON.stringify(['finance', 'risk', 'portfolio', 'quantitative', 'Monte Carlo']),
            tools: JSON.stringify(['workspace', 'leaderboard']),
            pricing: 'paid',
            price: 14.99,
            rating: 4.7,
            ratingCount: 112,
            installCount: 1876,
            usageCount: 9456,
            forkCount: 56,
            isFeatured: true,
            isOfficial: false,
            version: '2.0.0',
          },
          {
            authorId: 'dev.tools@opensrc.dev',
            authorName: 'DevTools Collective',
            name: 'CodePilot X',
            description:
              'Full-stack code generation copilot with deep knowledge of modern frameworks. Generates clean, tested, documented code with architecture recommendations.',
            category: 'code_gen',
            systemPrompt:
              'You are CodePilot X, a full-stack code generation assistant. You generate clean, well-tested, and documented code across all modern frameworks (Next.js, React, Vue, Svelte, Django, FastAPI, etc.). You provide architecture recommendations, design pattern suggestions, and security best practices. Always include unit tests and inline documentation.',
            avatarColor: '#f97316',
            tags: JSON.stringify(['code-gen', 'fullstack', 'testing', 'architecture', 'documentation']),
            tools: JSON.stringify(['workspace', 'community']),
            pricing: 'free',
            rating: 4.2,
            ratingCount: 78,
            installCount: 1456,
            usageCount: 7890,
            forkCount: 42,
            isFeatured: false,
            isOfficial: false,
            version: '1.8.3',
          },
        ],
      })
    }

    /* ── Build query ── */
    const where: Record<string, unknown> = { isPublished: true }

    if (category !== 'all') {
      where.category = category
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { tags: { contains: search } },
      ]
    }
    if (featured) {
      where.isFeatured = true
    }

    /* ── Sort ── */
    let orderBy: Record<string, string> = { installCount: 'desc' }
    if (sort === 'rating') orderBy = { rating: 'desc' }
    if (sort === 'newest') orderBy = { createdAt: 'desc' }

    const copilots = await db.customCopilot.findMany({
      where,
      orderBy,
    })

    /* ── Stats ── */
    const stats = {
      total: await db.customCopilot.count({ where: { isPublished: true } }),
      totalInstalls: (
        await db.customCopilot.aggregate({
          _sum: { installCount: true },
          where: { isPublished: true },
        })
      )._sum.installCount || 0,
      categories: (await db.customCopilot.groupBy({ by: ['category'], where: { isPublished: true } })).length,
      featured: await db.customCopilot.count({ where: { isPublished: true, isFeatured: true } }),
    }

    return NextResponse.json({ copilots, stats })
  } catch (error) {
    console.error('[GET /api/studio/copilots]', error)
    return NextResponse.json({ error: 'Failed to fetch copilots' }, { status: 500 })
  }
}

/* ═══════════════════════════════════════════
   POST /api/studio/copilots — Create copilot
   ═══════════════════════════════════════════ */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { name, description, category, systemPrompt, avatarColor, tags, tools, pricing, price, authorId, authorName } =
      body

    if (!name || !description || !category || !systemPrompt || !authorId) {
      return NextResponse.json(
        { error: 'Missing required fields: name, description, category, systemPrompt, authorId' },
        { status: 400 }
      )
    }

    const copilot = await db.customCopilot.create({
      data: {
        name,
        description,
        category,
        systemPrompt,
        avatarColor: avatarColor || '#5B8DB8',
        tags: tags ? JSON.stringify(tags) : null,
        tools: tools ? JSON.stringify(tools) : null,
        pricing: pricing || 'free',
        price: pricing === 'paid' ? price : null,
        authorId,
        authorName: authorName || null,
      },
    })

    return NextResponse.json({ copilot }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/studio/copilots]', error)
    return NextResponse.json({ error: 'Failed to create copilot' }, { status: 500 })
  }
}
