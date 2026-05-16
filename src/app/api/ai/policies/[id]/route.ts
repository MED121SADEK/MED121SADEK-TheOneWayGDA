import { NextRequest, NextResponse } from 'next/server'
import { getPolicies } from '../route'
import type { AiPolicy } from '../route'

/* ══════════════════════════════════════════════════════
   PUT /api/ai/policies/[id] — Update a policy
   ══════════════════════════════════════════════════════ */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const policies = getPolicies()
    const index = policies.findIndex(p => p.id === id)

    if (index === -1) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 })
    }

    const body = await request.json()
    const existing = policies[index]

    const updated: AiPolicy = {
      ...existing,
      name: body.name ?? existing.name,
      scope: body.scope ?? existing.scope,
      projectId: body.projectId ?? existing.projectId,
      category: body.category ?? existing.category,
      rules: Array.isArray(body.rules) ? body.rules : existing.rules,
      isActive: body.isActive ?? existing.isActive,
      updatedAt: new Date().toISOString(),
    }

    policies[index] = updated

    return NextResponse.json({ policy: updated })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

/* ══════════════════════════════════════════════════════
   DELETE /api/ai/policies/[id] — Delete a policy
   ══════════════════════════════════════════════════════ */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const policies = getPolicies()
    const index = policies.findIndex(p => p.id === id)

    if (index === -1) {
      return NextResponse.json({ error: 'Policy not found' }, { status: 404 })
    }

    const deleted = policies.splice(index, 1)[0]

    return NextResponse.json({ policy: deleted })
  } catch {
    return NextResponse.json({ error: 'Failed to delete policy' }, { status: 500 })
  }
}
