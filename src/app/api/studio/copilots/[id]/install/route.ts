import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/* ═══════════════════════════════════════════
   POST /api/studio/copilots/[id]/install — Install / Uninstall
   ═══════════════════════════════════════════ */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { userId, action } = body // action: "install" | "uninstall"

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, action (install|uninstall)' },
        { status: 400 }
      )
    }

    const copilot = await db.customCopilot.findUnique({ where: { id } })
    if (!copilot) {
      return NextResponse.json({ error: 'Copilot not found' }, { status: 404 })
    }

    if (action === 'install') {
      /* ── Check if already installed ── */
      const existing = await db.copilotInstall.findUnique({
        where: { copilotId_userId: { copilotId: id, userId } },
      })

      if (existing) {
        return NextResponse.json({ message: 'Already installed', installed: true })
      }

      /* ── Create install record & increment count ── */
      await db.copilotInstall.create({
        data: { copilotId: id, userId },
      })

      await db.customCopilot.update({
        where: { id },
        data: { installCount: { increment: 1 } },
      })

      return NextResponse.json({ installed: true }, { status: 201 })
    }

    if (action === 'uninstall') {
      const existing = await db.copilotInstall.findUnique({
        where: { copilotId_userId: { copilotId: id, userId } },
      })

      if (!existing) {
        return NextResponse.json({ message: 'Not installed', installed: false })
      }

      await db.copilotInstall.delete({
        where: { copilotId_userId: { copilotId: id, userId } },
      })

      await db.customCopilot.update({
        where: { id },
        data: { installCount: { decrement: 1 } },
      })

      return NextResponse.json({ installed: false })
    }

    return NextResponse.json({ error: 'Invalid action. Use "install" or "uninstall"' }, { status: 400 })
  } catch (error) {
    console.error('[POST /api/studio/copilots/[id]/install]', error)
    return NextResponse.json({ error: 'Failed to toggle install' }, { status: 500 })
  }
}
