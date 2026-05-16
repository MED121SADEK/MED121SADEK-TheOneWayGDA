import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ─── Constants ───

const VALID_CATEGORIES = [
  'reasoning',
  'coding',
  'creative',
  'math',
  'multilingual',
  'safety',
  'general',
] as const

const VALID_DIFFICULTIES = [
  'easy',
  'intermediate',
  'hard',
  'expert',
] as const

const VALID_SORT_FIELDS = [
  'newest',
  'popular',
  'rating',
  'most_used',
  'most_forked',
] as const

// ─── GET: List benchmark configurations ───

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const difficulty = searchParams.get('difficulty')
    const sort = (searchParams.get('sort') || 'newest') as (typeof VALID_SORT_FIELDS)[number]
    const author = searchParams.get('author')
    const search = searchParams.get('search')
    const featured = searchParams.get('featured')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)

    // Build where clause
    const where: Record<string, unknown> = {}

    if (category && VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])) {
      where.category = category
    }

    if (difficulty && VALID_DIFFICULTIES.includes(difficulty as (typeof VALID_DIFFICULTIES)[number])) {
      where.difficulty = difficulty
    }

    if (author) {
      where.author = author.toLowerCase()
    }

    if (featured === 'true') {
      where.isFeatured = true
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ]
    }

    // Build order by
    const orderBy: Record<string, string> =
      sort === 'popular'
        ? { forkCount: 'desc' }
        : sort === 'rating'
          ? { rating: 'desc' }
          : sort === 'most_used'
            ? { usageCount: 'desc' }
            : sort === 'most_forked'
              ? { forkCount: 'desc' }
              : { createdAt: 'desc' }

    const skip = (page - 1) * limit

    const [configs, total] = await Promise.all([
      db.benchmarkConfig.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      db.benchmarkConfig.count({ where }),
    ])

    // Parse JSON fields for response
    const enriched = configs.map((c) => ({
      ...c,
      testPrompts: JSON.parse(c.testPrompts),
      evaluationCriteria: JSON.parse(c.evaluationCriteria),
      expectedOutputs: c.expectedOutputs ? JSON.parse(c.expectedOutputs) : [],
      modelIds: c.modelIds ? JSON.parse(c.modelIds) : [],
      results: c.results ? JSON.parse(c.results) : null,
    }))

    return NextResponse.json({
      configs: enriched,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      filters: {
        categories: VALID_CATEGORIES,
        difficulties: VALID_DIFFICULTIES,
        sortOptions: VALID_SORT_FIELDS,
      },
    })
  } catch (error) {
    console.error('Benchmark configs list error:', error)
    return NextResponse.json(
      { error: 'Failed to load benchmark configurations' },
      { status: 500 },
    )
  }
}

// ─── POST: Share a new benchmark configuration ───

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      sourceConfigId,
      author,
      authorName,
      name,
      description,
      category,
      difficulty,
      testPrompts,
      evaluationCriteria,
      expectedOutputs,
      modelIds,
    } = body

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Benchmark configuration name is required.' },
        { status: 400 },
      )
    }

    if (!author?.trim()) {
      return NextResponse.json(
        { error: 'Author (email) is required.' },
        { status: 400 },
      )
    }

    if (!Array.isArray(testPrompts) || testPrompts.length === 0) {
      return NextResponse.json(
        { error: 'At least one test prompt is required.' },
        { status: 400 },
      )
    }

    if (!evaluationCriteria || typeof evaluationCriteria !== 'object') {
      return NextResponse.json(
        { error: 'Evaluation criteria must be an object with metrics and weights.' },
        { status: 400 },
      )
    }

    if (!evaluationCriteria.metrics || !Array.isArray(evaluationCriteria.metrics)) {
      return NextResponse.json(
        { error: 'Evaluation criteria must include a "metrics" array.' },
        { status: 400 },
      )
    }

    if (category && !VALID_CATEGORIES.includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 },
      )
    }

    if (difficulty && !VALID_DIFFICULTIES.includes(difficulty)) {
      return NextResponse.json(
        { error: `Invalid difficulty. Must be one of: ${VALID_DIFFICULTIES.join(', ')}` },
        { status: 400 },
      )
    }

    // Validate each test prompt
    for (const prompt of testPrompts) {
      if (!prompt.prompt?.trim()) {
        return NextResponse.json(
          { error: 'Each test prompt must have a "prompt" field.' },
          { status: 400 },
        )
      }
    }

    // If forking from an existing config, increment fork count on source
    if (sourceConfigId) {
      const sourceExists = await db.benchmarkConfig.findUnique({
        where: { id: sourceConfigId },
      })

      if (sourceExists) {
        await db.benchmarkConfig.update({
          where: { id: sourceConfigId },
          data: { forkCount: { increment: 1 } },
        })
      }
    }

    const config = await db.benchmarkConfig.create({
      data: {
        sourceConfigId: sourceConfigId || null,
        author: author.trim().toLowerCase(),
        authorName: authorName?.trim() || null,
        name: name.trim(),
        description: description?.trim() || null,
        category: category || 'general',
        difficulty: difficulty || 'intermediate',
        testPrompts: JSON.stringify(testPrompts),
        evaluationCriteria: JSON.stringify(evaluationCriteria),
        expectedOutputs: expectedOutputs ? JSON.stringify(expectedOutputs) : null,
        modelIds: modelIds ? JSON.stringify(modelIds) : null,
      },
    })

    return NextResponse.json({
      config: {
        ...config,
        testPrompts: JSON.parse(config.testPrompts),
        evaluationCriteria: JSON.parse(config.evaluationCriteria),
        expectedOutputs: config.expectedOutputs ? JSON.parse(config.expectedOutputs) : [],
        modelIds: config.modelIds ? JSON.parse(config.modelIds) : [],
      },
      success: true,
    }, { status: 201 })
  } catch (error) {
    console.error('Benchmark config creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create benchmark configuration' },
      { status: 500 },
    )
  }
}

// ─── PATCH: Update benchmark configuration metadata ───

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, author: requesterEmail, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Configuration ID is required.' },
        { status: 400 },
      )
    }

    // Verify the config exists
    const existing = await db.benchmarkConfig.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Benchmark configuration not found.' },
        { status: 404 },
      )
    }

    // Only the original author can update the config
    if (requesterEmail && existing.author !== requesterEmail.toLowerCase()) {
      return NextResponse.json(
        { error: 'Only the original author can update this configuration.' },
        { status: 403 },
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (updates.name !== undefined && updates.name?.trim()) {
      updateData.name = updates.name.trim()
    }

    if (updates.description !== undefined) {
      updateData.description = updates.description?.trim() || null
    }

    if (updates.category !== undefined && VALID_CATEGORIES.includes(updates.category)) {
      updateData.category = updates.category
    }

    if (updates.difficulty !== undefined && VALID_DIFFICULTIES.includes(updates.difficulty)) {
      updateData.difficulty = updates.difficulty
    }

    if (updates.testPrompts !== undefined && Array.isArray(updates.testPrompts) && updates.testPrompts.length > 0) {
      for (const prompt of updates.testPrompts) {
        if (!prompt.prompt?.trim()) {
          return NextResponse.json(
            { error: 'Each test prompt must have a "prompt" field.' },
            { status: 400 },
          )
        }
      }
      updateData.testPrompts = JSON.stringify(updates.testPrompts)
    }

    if (updates.evaluationCriteria !== undefined && updates.evaluationCriteria?.metrics) {
      updateData.evaluationCriteria = JSON.stringify(updates.evaluationCriteria)
    }

    if (updates.expectedOutputs !== undefined) {
      updateData.expectedOutputs = Array.isArray(updates.expectedOutputs)
        ? JSON.stringify(updates.expectedOutputs)
        : null
    }

    if (updates.results !== undefined) {
      updateData.results = updates.results ? JSON.stringify(updates.results) : null
    }

    if (updates.modelIds !== undefined) {
      updateData.modelIds = Array.isArray(updates.modelIds) && updates.modelIds.length > 0
        ? JSON.stringify(updates.modelIds)
        : null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update.' },
        { status: 400 },
      )
    }

    const updated = await db.benchmarkConfig.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      config: {
        ...updated,
        testPrompts: JSON.parse(updated.testPrompts),
        evaluationCriteria: JSON.parse(updated.evaluationCriteria),
        expectedOutputs: updated.expectedOutputs ? JSON.parse(updated.expectedOutputs) : [],
        modelIds: updated.modelIds ? JSON.parse(updated.modelIds) : [],
        results: updated.results ? JSON.parse(updated.results) : null,
      },
      success: true,
    })
  } catch (error) {
    console.error('Benchmark config update error:', error)
    return NextResponse.json(
      { error: 'Failed to update benchmark configuration' },
      { status: 500 },
    )
  }
}
