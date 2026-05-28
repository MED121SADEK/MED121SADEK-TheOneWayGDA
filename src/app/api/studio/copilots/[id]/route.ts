import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/* ═══════════════════════════════════════════
   GET /api/studio/copilots/[id] — Single copilot
   ═══════════════════════════════════════════ */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const copilot = await db.customCopilot.findUnique({
      where: { id },
      include: {
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: {
          select: { reviews: true, installs: true },
        },
      },
    })

    if (!copilot) {
      return NextResponse.json({ error: 'Copilot not found' }, { status: 404 })
    }

    return NextResponse.json({ copilot })
  } catch (error) {
    console.error('[GET /api/studio/copilots/[id]]', error)
    return NextResponse.json({ error: 'Failed to fetch copilot' }, { status: 500 })
  }
}

/* ═══════════════════════════════════════════
   PATCH /api/studio/copilots/[id] — Update copilot
   ═══════════════════════════════════════════ */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const existing = await db.customCopilot.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Copilot not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() }

    const allowedFields = [
      'name',
      'description',
      'category',
      'systemPrompt',
      'avatarColor',
      'pricing',
      'price',
      'isPublished',
      'isFeatured',
      'version',
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (body.tags !== undefined) {
      updateData.tags = JSON.stringify(body.tags)
    }
    if (body.tools !== undefined) {
      updateData.tools = JSON.stringify(body.tools)
    }

    const copilot = await db.customCopilot.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ copilot })
  } catch (error) {
    console.error('[PATCH /api/studio/copilots/[id]]', error)
    return NextResponse.json({ error: 'Failed to update copilot' }, { status: 500 })
  }
}

/* ═══════════════════════════════════════════
   DELETE /api/studio/copilots/[id] — Delete copilot
   ═══════════════════════════════════════════ */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const existing = await db.customCopilot.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Copilot not found' }, { status: 404 })
    }

    await db.customCopilot.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/studio/copilots/[id]]', error)
    return NextResponse.json({ error: 'Failed to delete copilot' }, { status: 500 })
  }
}
