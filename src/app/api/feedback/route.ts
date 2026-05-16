import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.json')

interface FeedbackEntry {
  id: string
  rating: number
  category: string
  message: string
  email?: string
  page: string
  userAgent: string
  timestamp: string
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR)
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true })
  }
}

async function readFeedback(): Promise<FeedbackEntry[]> {
  try {
    const raw = await fs.readFile(FEEDBACK_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

async function writeFeedback(entries: FeedbackEntry[]) {
  await ensureDataDir()
  await fs.writeFile(FEEDBACK_FILE, JSON.stringify(entries, null, 2), 'utf-8')
}

// ──────────────────────────────────────────────────────────
// POST: Submit feedback
// ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { rating, category, message, email, page, userAgent, timestamp } = body as {
      rating: number
      category: string
      message: string
      email?: string
      page?: string
      userAgent?: string
      timestamp?: string
    }

    // Validate required fields
    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      )
    }

    if (!category || !['bug', 'feature', 'general', 'uiux'].includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category. Must be one of: bug, feature, general, uiux' },
        { status: 400 }
      )
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    if (message.length > 10000) {
      return NextResponse.json(
        { error: 'Message is too long (max 10,000 characters)' },
        { status: 400 }
      )
    }

    const entry: FeedbackEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      rating,
      category,
      message: message.trim(),
      email: email?.trim() || undefined,
      page: page || 'unknown',
      userAgent: userAgent || 'unknown',
      timestamp: timestamp || new Date().toISOString(),
    }

    // Persist to JSON file
    const existing = await readFeedback()
    existing.push(entry)
    await writeFeedback(existing)

    return NextResponse.json({
      status: 'ok',
      id: entry.id,
      message: 'Feedback received. Thank you!',
    })
  } catch (error) {
    console.error('[Feedback API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// ──────────────────────────────────────────────────────────
// GET: List feedback (for admin/future dashboard)
// ──────────────────────────────────────────────────────────

export async function GET() {
  try {
    const entries = await readFeedback()
    return NextResponse.json({
      status: 'ok',
      count: entries.length,
      data: entries,
    })
  } catch (error) {
    console.error('[Feedback API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
