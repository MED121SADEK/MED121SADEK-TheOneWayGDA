import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ─── Constants ───

const VALID_CATEGORIES = [
  'data_analysis',
  'reporting',
  'ml_pipeline',
  'data_cleaning',
  'benchmarking',
  'general',
] as const

const VALID_DIFFICULTIES = [
  'beginner',
  'intermediate',
  'advanced',
] as const

const VALID_SORT_FIELDS = [
  'popular',
  'newest',
  'rating',
  'most_used',
  'most_forked',
] as const

// ─── GET: List shared workflows ───

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
        { intent: { contains: search } },
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

    const [workflows, total] = await Promise.all([
      db.sharedWorkflow.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      db.sharedWorkflow.count({ where }),
    ])

    // Parse JSON fields for response
    const enriched = workflows.map((w) => ({
      ...w,
      steps: JSON.parse(w.steps),
      tags: w.tags ? JSON.parse(w.tags) : [],
    }))

    return NextResponse.json({
      workflows: enriched,
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
    console.error('Shared workflows list error:', error)
    return NextResponse.json(
      { error: 'Failed to load shared workflows' },
      { status: 500 },
    )
  }
}

// ─── POST: Share a workflow pipeline ───

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      sourcePipelineId,
      author,
      authorName,
      name,
      description,
      intent,
      steps,
      category,
      difficulty,
      tags,
    } = body

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Workflow name is required.' },
        { status: 400 },
      )
    }

    if (!author?.trim()) {
      return NextResponse.json(
        { error: 'Author (email) is required.' },
        { status: 400 },
      )
    }

    if (!Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json(
        { error: 'At least one workflow step is required.' },
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

    // If sourcePipelineId provided, verify it exists and snapshot its data
    let snapshotSteps = steps
    let snapshotIntent = intent

    if (sourcePipelineId) {
      const pipeline = await db.workflowPipeline.findUnique({
        where: { id: sourcePipelineId },
      })

      if (pipeline) {
        snapshotSteps = JSON.parse(pipeline.steps)
        snapshotIntent = snapshotIntent || pipeline.intent
      }
    }

    // Validate each step has required fields
    for (const step of snapshotSteps) {
      if (!step.type || !step.name) {
        return NextResponse.json(
          { error: 'Each step must have at least a "type" and "name" field.' },
          { status: 400 },
        )
      }
    }

    const workflow = await db.sharedWorkflow.create({
      data: {
        sourcePipelineId: sourcePipelineId || null,
        author: author.trim().toLowerCase(),
        authorName: authorName?.trim() || null,
        name: name.trim(),
        description: description?.trim() || null,
        intent: snapshotIntent?.trim() || null,
        steps: JSON.stringify(snapshotSteps),
        category: category || 'general',
        difficulty: difficulty || 'intermediate',
        tags: Array.isArray(tags) && tags.length > 0 ? JSON.stringify(tags.map(String).slice(0, 10)) : null,
      },
    })

    return NextResponse.json({
      workflow: {
        ...workflow,
        steps: JSON.parse(workflow.steps),
        tags: workflow.tags ? JSON.parse(workflow.tags) : [],
      },
      success: true,
    }, { status: 201 })
  } catch (error) {
    console.error('Shared workflow creation error:', error)
    return NextResponse.json(
      { error: 'Failed to share workflow' },
      { status: 500 },
    )
  }
}

// ─── PATCH: Update shared workflow metadata ───

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, author: requesterEmail, ...updates } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Workflow ID is required.' },
        { status: 400 },
      )
    }

    // Verify the workflow exists
    const existing = await db.sharedWorkflow.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Workflow not found.' },
        { status: 404 },
      )
    }

    // Only the original author can update the workflow
    if (requesterEmail && existing.author !== requesterEmail.toLowerCase()) {
      return NextResponse.json(
        { error: 'Only the original author can update this workflow.' },
        { status: 403 },
      )
    }

    // Build update data — only allow specific fields
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

    if (updates.tags !== undefined) {
      updateData.tags = Array.isArray(updates.tags) && updates.tags.length > 0
        ? JSON.stringify(updates.tags.map(String).slice(0, 10))
        : null
    }

    if (updates.steps !== undefined && Array.isArray(updates.steps) && updates.steps.length > 0) {
      for (const step of updates.steps) {
        if (!step.type || !step.name) {
          return NextResponse.json(
            { error: 'Each step must have at least a "type" and "name" field.' },
            { status: 400 },
          )
        }
      }
      updateData.steps = JSON.stringify(updates.steps)
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update.' },
        { status: 400 },
      )
    }

    const updated = await db.sharedWorkflow.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      workflow: {
        ...updated,
        steps: JSON.parse(updated.steps),
        tags: updated.tags ? JSON.parse(updated.tags) : [],
      },
      success: true,
    })
  } catch (error) {
    console.error('Shared workflow update error:', error)
    return NextResponse.json(
      { error: 'Failed to update workflow' },
      { status: 500 },
    )
  }
}
