import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ─── Constants ───

const VALID_CATEGORIES = [
  'statistical',
  'machine_learning',
  'data_cleaning',
  'visualization',
  'reporting',
  'benchmarking',
] as const

const VALID_DIFFICULTIES = [
  'beginner',
  'intermediate',
  'advanced',
] as const

const VALID_STEP_TYPES = [
  'data_prep',
  'analysis',
  'visualization',
  'interpretation',
] as const

const VALID_SORT_FIELDS = [
  'newest',
  'popular',
  'rating',
  'most_used',
] as const

// ─── GET: List community-contributed analysis templates ───

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const difficulty = searchParams.get('difficulty')
    const sort = (searchParams.get('sort') || 'popular') as (typeof VALID_SORT_FIELDS)[number]
    const author = searchParams.get('author')
    const search = searchParams.get('search')
    const featured = searchParams.get('featured')
    const official = searchParams.get('official')
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

    if (official === 'true') {
      where.isOfficial = true
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
        ? { usageCount: 'desc' }
        : sort === 'rating'
          ? { rating: 'desc' }
          : sort === 'most_used'
            ? { usageCount: 'desc' }
            : { createdAt: 'desc' }

    const skip = (page - 1) * limit

    const [templates, total] = await Promise.all([
      db.communityAnalysisTemplate.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      db.communityAnalysisTemplate.count({ where }),
    ])

    // Parse JSON fields for response
    const enriched = templates.map((t) => ({
      ...t,
      steps: JSON.parse(t.steps),
      requiredVariables: t.requiredVariables ? JSON.parse(t.requiredVariables) : [],
      tags: t.tags ? JSON.parse(t.tags) : [],
    }))

    // Aggregate stats
    const stats = await db.communityAnalysisTemplate.aggregate({
      _count: true,
      _avg: { rating: true },
      _sum: { usageCount: true },
    })

    return NextResponse.json({
      templates: enriched,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats: {
        totalTemplates: stats._count,
        avgRating: stats._avg.rating ? Math.round(stats._avg.rating * 100) / 100 : 0,
        totalUsage: stats._sum.usageCount || 0,
      },
      filters: {
        categories: VALID_CATEGORIES,
        difficulties: VALID_DIFFICULTIES,
        sortOptions: VALID_SORT_FIELDS,
      },
    })
  } catch (error) {
    console.error('Analysis templates list error:', error)
    return NextResponse.json(
      { error: 'Failed to load analysis templates' },
      { status: 500 },
    )
  }
}

// ─── POST: Contribute a new analysis template ───

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      sourceTemplateId,
      author,
      authorName,
      name,
      description,
      category,
      difficulty,
      steps,
      requiredVariables,
      estimatedDuration,
      tags,
    } = body

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Template name is required.' },
        { status: 400 },
      )
    }

    if (!author?.trim()) {
      return NextResponse.json(
        { error: 'Author (email) is required.' },
        { status: 400 },
      )
    }

    if (!description?.trim()) {
      return NextResponse.json(
        { error: 'Template description is required.' },
        { status: 400 },
      )
    }

    if (!Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json(
        { error: 'At least one template step is required.' },
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

    // Validate each step
    for (const step of steps) {
      if (!step.name?.trim()) {
        return NextResponse.json(
          { error: 'Each step must have a "name" field.' },
          { status: 400 },
        )
      }
      if (step.type && !VALID_STEP_TYPES.includes(step.type)) {
        return NextResponse.json(
          { error: `Invalid step type "${step.type}". Must be one of: ${VALID_STEP_TYPES.join(', ')}` },
          { status: 400 },
        )
      }
    }

    // If this is an improvement on an existing template, increment improvement count
    let version = 1
    if (sourceTemplateId) {
      const source = await db.communityAnalysisTemplate.findUnique({
        where: { id: sourceTemplateId },
      })

      if (source) {
        await db.communityAnalysisTemplate.update({
          where: { id: sourceTemplateId },
          data: { improvementCount: { increment: 1 } },
        })
        version = source.version + 1
      }
    }

    // Normalize steps with order numbers
    const normalizedSteps = steps.map((step: Record<string, unknown>, index: number) => ({
      id: step.id || `step_${Date.now().toString(36)}_${index}`,
      order: step.order ?? index + 1,
      name: String(step.name).trim(),
      description: String(step.description || '').trim(),
      type: step.type || 'analysis',
      config: step.config || {},
    }))

    const template = await db.communityAnalysisTemplate.create({
      data: {
        sourceTemplateId: sourceTemplateId || null,
        author: author.trim().toLowerCase(),
        authorName: authorName?.trim() || null,
        name: name.trim(),
        description: description.trim(),
        category: category || 'statistical',
        difficulty: difficulty || 'intermediate',
        steps: JSON.stringify(normalizedSteps),
        requiredVariables: Array.isArray(requiredVariables) && requiredVariables.length > 0
          ? JSON.stringify(requiredVariables.map(String))
          : null,
        estimatedDuration: estimatedDuration?.trim() || null,
        tags: Array.isArray(tags) && tags.length > 0
          ? JSON.stringify(tags.map(String).slice(0, 10))
          : null,
        version,
      },
    })

    return NextResponse.json({
      template: {
        ...template,
        steps: JSON.parse(template.steps),
        requiredVariables: template.requiredVariables ? JSON.parse(template.requiredVariables) : [],
        tags: template.tags ? JSON.parse(template.tags) : [],
      },
      success: true,
    }, { status: 201 })
  } catch (error) {
    console.error('Analysis template creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create analysis template' },
      { status: 500 },
    )
  }
}

// ─── PATCH: Update analysis template ───

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, author: requesterEmail, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Template ID is required.' },
        { status: 400 },
      )
    }

    // Verify the template exists
    const existing = await db.communityAnalysisTemplate.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Template not found.' },
        { status: 404 },
      )
    }

    // Only the original author can update the template
    if (requesterEmail && existing.author !== requesterEmail.toLowerCase()) {
      return NextResponse.json(
        { error: 'Only the original author can update this template.' },
        { status: 403 },
      )
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (updates.name !== undefined && updates.name?.trim()) {
      updateData.name = updates.name.trim()
    }

    if (updates.description !== undefined && updates.description?.trim()) {
      updateData.description = updates.description.trim()
    }

    if (updates.category !== undefined && VALID_CATEGORIES.includes(updates.category)) {
      updateData.category = updates.category
    }

    if (updates.difficulty !== undefined && VALID_DIFFICULTIES.includes(updates.difficulty)) {
      updateData.difficulty = updates.difficulty
    }

    if (updates.steps !== undefined && Array.isArray(updates.steps) && updates.steps.length > 0) {
      for (const step of updates.steps) {
        if (!step.name?.trim()) {
          return NextResponse.json(
            { error: 'Each step must have a "name" field.' },
            { status: 400 },
          )
        }
      }

      const normalizedSteps = updates.steps.map((step: Record<string, unknown>, index: number) => ({
        id: step.id || `step_${Date.now().toString(36)}_${index}`,
        order: step.order ?? index + 1,
        name: String(step.name).trim(),
        description: String(step.description || '').trim(),
        type: step.type || 'analysis',
        config: step.config || {},
      }))

      updateData.steps = JSON.stringify(normalizedSteps)
      updateData.version = { increment: 1 }
    }

    if (updates.requiredVariables !== undefined) {
      updateData.requiredVariables = Array.isArray(updates.requiredVariables) && updates.requiredVariables.length > 0
        ? JSON.stringify(updates.requiredVariables.map(String))
        : null
    }

    if (updates.estimatedDuration !== undefined) {
      updateData.estimatedDuration = updates.estimatedDuration?.trim() || null
    }

    if (updates.tags !== undefined) {
      updateData.tags = Array.isArray(updates.tags) && updates.tags.length > 0
        ? JSON.stringify(updates.tags.map(String).slice(0, 10))
        : null
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update.' },
        { status: 400 },
      )
    }

    const updated = await db.communityAnalysisTemplate.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      template: {
        ...updated,
        steps: JSON.parse(updated.steps),
        requiredVariables: updated.requiredVariables ? JSON.parse(updated.requiredVariables) : [],
        tags: updated.tags ? JSON.parse(updated.tags) : [],
      },
      success: true,
    })
  } catch (error) {
    console.error('Analysis template update error:', error)
    return NextResponse.json(
      { error: 'Failed to update analysis template' },
      { status: 500 },
    )
  }
}
