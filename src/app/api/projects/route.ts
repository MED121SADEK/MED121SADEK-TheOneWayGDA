import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/require-auth'

export async function GET(request: NextRequest) {
  const user = await requireAuth(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 })

  try {
    const projects = await db.project.findMany({
      where: { userId: user.userId },
      orderBy: { updatedAt: 'desc' },
    })
    return NextResponse.json(projects)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const user = await requireAuth(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 })

  try {
    const body = await request.json()
    const project = await db.project.create({
      data: {
        name: body.name || 'Untitled',
        description: body.description || '',
        data: body.data || '{}',
        variables: body.variables || '[]',
        outputs: body.outputs || '[]',
        shared: body.shared || false,
        sharedWith: body.sharedWith || null,
        userId: user.userId,
      },
    })
    return NextResponse.json(project)
  } catch {
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const user = await requireAuth(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 })

  try {
    const body = await request.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    // Verify ownership before updating
    const existing = await db.project.findUnique({ where: { id } })
    if (!existing || existing.userId !== user.userId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const project = await db.project.update({
      where: { id },
      data,
    })
    return NextResponse.json(project)
  } catch {
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const user = await requireAuth(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 })

    // Verify ownership before deleting
    const existing = await db.project.findUnique({ where: { id } })
    if (!existing || existing.userId !== user.userId) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    await db.project.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 })
  }
}