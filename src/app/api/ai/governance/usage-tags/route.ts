import { NextRequest, NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'

/* ══════════════════════════════════════════════════════
   Types
   ══════════════════════════════════════════════════════ */

interface UsageTag {
  id: string
  name: string
  description: string
  color: string
  category: 'environment' | 'purpose' | 'sensitivity' | 'custom'
  isActive: boolean
  totalQueries: number
  totalTokensUsed: number
  totalAutomationRuns: number
  firstUsed: string | null
  lastUsed: string | null
  createdAt: string
  updatedAt: string
}

interface TagAssignment {
  auditLogId: string
  tagId: string
  assignedAt: string
}

/* ══════════════════════════════════════════════════════
   In-memory tag store via globalThis
   ══════════════════════════════════════════════════════ */

declare global {
  var __aiUsageTags: UsageTag[] | undefined
  var __aiTagAssignments: TagAssignment[] | undefined
}

function getTags(): UsageTag[] {
  if (!globalThis.__aiUsageTags) {
    const now = new Date().toISOString()
    globalThis.__aiUsageTags = [
      {
        id: 'tag-research',
        name: 'Research',
        description: 'AI queries used for research and exploration purposes',
        color: '#3b82f6',
        category: 'purpose' as const,
        isActive: true,
        totalQueries: 0,
        totalTokensUsed: 0,
        totalAutomationRuns: 0,
        firstUsed: null,
        lastUsed: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'tag-production',
        name: 'Production',
        description: 'AI queries running in production environment',
        color: '#ef4444',
        category: 'environment' as const,
        isActive: true,
        totalQueries: 0,
        totalTokensUsed: 0,
        totalAutomationRuns: 0,
        firstUsed: null,
        lastUsed: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'tag-testing',
        name: 'Testing',
        description: 'AI queries used for testing and quality assurance',
        color: '#f59e0b',
        category: 'environment' as const,
        isActive: true,
        totalQueries: 0,
        totalTokensUsed: 0,
        totalAutomationRuns: 0,
        firstUsed: null,
        lastUsed: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'tag-sensitive',
        name: 'Sensitive Data',
        description: 'AI operations involving sensitive or personal data',
        color: '#dc2626',
        category: 'sensitivity' as const,
        isActive: true,
        totalQueries: 0,
        totalTokensUsed: 0,
        totalAutomationRuns: 0,
        firstUsed: null,
        lastUsed: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'tag-analytics',
        name: 'Analytics',
        description: 'AI queries used for data analytics and reporting',
        color: '#8b5cf6',
        category: 'purpose' as const,
        isActive: true,
        totalQueries: 0,
        totalTokensUsed: 0,
        totalAutomationRuns: 0,
        firstUsed: null,
        lastUsed: null,
        createdAt: now,
        updatedAt: now,
      },
    ]
  }
  return globalThis.__aiUsageTags
}

function getTagAssignments(): TagAssignment[] {
  if (!globalThis.__aiTagAssignments) {
    globalThis.__aiTagAssignments = []
  }
  return globalThis.__aiTagAssignments
}

/* ══════════════════════════════════════════════════════
   Helper: Compute live stats for tags from audit logs
   ══════════════════════════════════════════════════════ */

async function computeTagStats(tagId: string): Promise<{
  totalQueries: number
  totalTokensUsed: number
  totalAutomationRuns: number
  firstUsed: string | null
  lastUsed: string | null
}> {
  const assignments = getTagAssignments().filter(
    (a) => a.tagId === tagId
  )
  const auditLogIds = assignments.map((a) => a.auditLogId)

  if (auditLogIds.length === 0) {
    return {
      totalQueries: 0,
      totalTokensUsed: 0,
      totalAutomationRuns: 0,
      firstUsed: null,
      lastUsed: null,
    }
  }

  const logs = await prisma.aiAuditLog.findMany({
    where: { id: { in: auditLogIds } },
    select: {
      tokensUsed: true,
      action: true,
      createdAt: true,
    },
  })

  const totalTokensUsed = logs.reduce(
    (sum, l) => sum + (l.tokensUsed || 0),
    0
  )
  const totalAutomationRuns = logs.filter(
    (l) => l.action === 'automation_run'
  ).length
  const sortedDates = logs
    .map((l) => l.createdAt.toISOString())
    .sort()
  const firstUsed = sortedDates[0] ?? null
  const lastUsed = sortedDates[sortedDates.length - 1] ?? null

  return {
    totalQueries: logs.length,
    totalTokensUsed,
    totalAutomationRuns,
    firstUsed,
    lastUsed,
  }
}

/* ══════════════════════════════════════════════════════
   GET /api/ai/governance/usage-tags
   Retrieve all usage tags and their statistics
   ══════════════════════════════════════════════════════ */

export async function GET() {
  try {
    const tags = getTags()
    const assignments = getTagAssignments()

    // Compute live stats for each tag
    const tagsWithStats = await Promise.all(
      tags.map(async (tag) => {
        const stats = await computeTagStats(tag.id)
        return {
          ...tag,
          totalQueries: stats.totalQueries,
          totalTokensUsed: stats.totalTokensUsed,
          totalAutomationRuns: stats.totalAutomationRuns,
          firstUsed: stats.firstUsed,
          lastUsed: stats.lastUsed,
        }
      })
    )

    // Aggregate summary
    const summary = {
      totalTags: tagsWithStats.length,
      activeTags: tagsWithStats.filter((t) => t.isActive).length,
      totalAssignments: assignments.length,
      totalTaggedQueries: tagsWithStats.reduce(
        (sum, t) => sum + t.totalQueries,
        0
      ),
      totalTaggedTokens: tagsWithStats.reduce(
        (sum, t) => sum + t.totalTokensUsed,
        0
      ),
      categories: [
        ...new Set(tagsWithStats.map((t) => t.category)),
      ],
    }

    return NextResponse.json({
      tags: tagsWithStats,
      summary,
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/* ══════════════════════════════════════════════════════
   POST /api/ai/governance/usage-tags
   Create a new usage tag
   ══════════════════════════════════════════════════════ */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, color, category } = body as {
      name: string
      description?: string
      color?: string
      category?: string
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      )
    }

    const validCategories = ['environment', 'purpose', 'sensitivity', 'custom'] as const
    const resolvedCategory = validCategories.includes(category)
      ? category
      : 'custom'

    // Validate color format (hex)
    const colorPattern = /^#[0-9a-fA-F]{6}$/
    const resolvedColor =
      color && colorPattern.test(color)
        ? color
        : '#6b7280'

    const tags = getTags()

    // Check for duplicate name
    if (tags.some(
      (t) => t.name.toLowerCase() === name.trim().toLowerCase()
    )) {
      return NextResponse.json(
        { error: 'A tag with this name already exists' },
        { status: 409 }
      )
    }

    const timestamp = new Date().toISOString()
    const newTag: UsageTag = {
      id: `tag-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      description:
        typeof description === 'string' ? description.trim() : '',
      color: resolvedColor,
      category: resolvedCategory,
      isActive: true,
      totalQueries: 0,
      totalTokensUsed: 0,
      totalAutomationRuns: 0,
      firstUsed: null,
      lastUsed: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    tags.push(newTag)

    return NextResponse.json({ tag: newTag }, { status: 201 })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}

/* ══════════════════════════════════════════════════════
   PATCH /api/ai/governance/usage-tags
   Update tag properties or assign/unassign tags to audit logs
   ══════════════════════════════════════════════════════ */

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      operation,
      tagId,
      auditLogIds,
      name,
      description,
      color,
      isActive,
    } = body as {
      operation?: 'assign' | 'unassign' | 'update'
      tagId?: string
      auditLogIds?: string[]
      name?: string
      description?: string
      color?: string
      isActive?: boolean
    }

    if (!operation) {
      return NextResponse.json(
        { error: 'Operation is required: assign, unassign, or update' },
        { status: 400 }
      )
    }

    const tags = getTags()
    const assignments = getTagAssignments()

    // ─── ASSIGN tags to audit logs ─────────────────────
    if (operation === 'assign') {
      if (!tagId) {
        return NextResponse.json(
          { error: 'tagId is required for assign operation' },
          { status: 400 }
        )
      }

      const tag = tags.find((t) => t.id === tagId)
      if (!tag) {
        return NextResponse.json(
          { error: `Tag not found: ${tagId}` },
          { status: 404 }
        )
      }

      if (!Array.isArray(auditLogIds) || auditLogIds.length === 0) {
        return NextResponse.json(
          { error: 'auditLogIds must be a non-empty array' },
          { status: 400 }
        )
      }

      // Validate audit log IDs exist
      const existingLogs = await prisma.aiAuditLog.findMany({
        where: { id: { in: auditLogIds } },
        select: { id: true },
      })
      const existingIds = new Set(existingLogs.map((l) => l.id))
      const invalidIds = auditLogIds.filter((id) => !existingIds.has(id))

      if (invalidIds.length > 0) {
        return NextResponse.json(
          {
            error: `Audit log IDs not found: ${invalidIds.slice(0, 5).join(', ')}${invalidIds.length > 5 ? ` and ${invalidIds.length - 5} more` : ''}`,
          },
          { status: 404 }
        )
      }

      // Create assignments (avoid duplicates)
      const existingAssignmentKeys = new Set(
        assignments.map((a) => `${a.auditLogId}:${a.tagId}`)
      )
      let newCount = 0
      for (const logId of auditLogIds) {
        const key = `${logId}:${tagId}`
        if (!existingAssignmentKeys.has(key)) {
          assignments.push({
            auditLogId: logId,
            tagId,
            assignedAt: new Date().toISOString(),
          })
          newCount++
        }
      }

      return NextResponse.json({
        message: `Assigned tag "${tag.name}" to ${newCount} audit log(s)`,
        assigned: newCount,
        skipped: auditLogIds.length - newCount,
      })
    }

    // ─── UNASSIGN tags from audit logs ─────────────────
    if (operation === 'unassign') {
      if (!tagId) {
        return NextResponse.json(
          { error: 'tagId is required for unassign operation' },
          { status: 400 }
        )
      }

      const tag = tags.find((t) => t.id === tagId)
      if (!tag) {
        return NextResponse.json(
          { error: `Tag not found: ${tagId}` },
          { status: 404 }
        )
      }

      const targetLogIds = Array.isArray(auditLogIds)
        ? auditLogIds
        : undefined

      const beforeLength = assignments.length
      globalThis.__aiTagAssignments = assignments.filter((a) => {
        if (a.tagId !== tagId) return true
        if (targetLogIds && !targetLogIds.includes(a.auditLogId)) return true
        return false
      })
      const removed = beforeLength - globalThis.__aiTagAssignments.length

      return NextResponse.json({
        message: `Unassigned tag "${tag.name}" from ${removed} audit log(s)`,
        removed,
      })
    }

    // ─── UPDATE tag properties ─────────────────────────
    if (operation === 'update') {
      if (!tagId) {
        return NextResponse.json(
          { error: 'tagId is required for update operation' },
          { status: 400 }
        )
      }

      const tagIndex = tags.findIndex((t) => t.id === tagId)
      if (tagIndex === -1) {
        return NextResponse.json(
          { error: `Tag not found: ${tagId}` },
          { status: 404 }
        )
      }

      const tag = tags[tagIndex]

      // Validate color format if provided
      if (color !== undefined) {
        const colorPattern = /^#[0-9a-fA-F]{6}$/
        if (!colorPattern.test(color)) {
          return NextResponse.json(
            { error: 'Color must be a valid hex color (e.g., #3b82f6)' },
            { status: 400 }
          )
        }
      }

      // Apply updates
      if (name !== undefined && typeof name === 'string') {
        const trimmedName = name.trim()
        if (trimmedName.length === 0) {
          return NextResponse.json(
            { error: 'Tag name cannot be empty' },
            { status: 400 }
          )
        }
        // Check for duplicate name (excluding current tag)
        const duplicate = tags.find(
          (t) =>
            t.id !== tagId &&
            t.name.toLowerCase() === trimmedName.toLowerCase()
        )
        if (duplicate) {
          return NextResponse.json(
            { error: 'A tag with this name already exists' },
            { status: 409 }
          )
        }
        tag.name = trimmedName
      }
      if (description !== undefined) {
        tag.description = typeof description === 'string' ? description.trim() : ''
      }
      if (color !== undefined) {
        tag.color = color
      }
      if (isActive !== undefined) {
        tag.isActive = Boolean(isActive)
      }
      tag.updatedAt = new Date().toISOString()
      tags[tagIndex] = tag

      return NextResponse.json({
        message: 'Tag updated successfully',
        tag,
      })
    }

    return NextResponse.json(
      { error: 'Invalid operation. Must be: assign, unassign, or update' },
      { status: 400 }
    )
  } catch (error: unknown) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
