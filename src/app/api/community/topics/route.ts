import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Topic Follow / Unfollow API
 * POST /api/community/topics — follow/unfollow a topic
 * GET /api/community/topics?visitorId=xxx — list followed topics
 */
const ALLOWED_TOPICS = [
  'AI', 'Research', 'Innovation',
  'Foundation Models', 'AI Agents', 'AI Video', 'AI Image', 'AI Audio',
  'AI Developer Tools', 'AI Frameworks', 'AI Hardware', 'AI Search',
  'Enterprise AI', 'Deep Learning', 'NLP', 'Computer Vision',
  'Data Analysis', 'Statistics', 'Machine Learning',
  'Open Source', 'Funding', 'AI Ethics',
]

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const visitorId = searchParams.get('visitorId')
    if (!visitorId) {
      return NextResponse.json({ error: 'visitorId required' }, { status: 400 })
    }

    const follows = await db.topicFollow.findMany({
      where: { visitorId },
      select: { topic: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({
      topics: follows.map(f => f.topic),
      availableTopics: ALLOWED_TOPICS,
    })
  } catch (error) {
    console.error('Topics GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch topics' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { visitorId, topic, action } = await request.json()

    if (!visitorId || !topic) {
      return NextResponse.json({ error: 'visitorId and topic required' }, { status: 400 })
    }
    if (!ALLOWED_TOPICS.includes(topic)) {
      return NextResponse.json({ error: 'Invalid topic', availableTopics: ALLOWED_TOPICS }, { status: 400 })
    }
    if (action !== 'follow' && action !== 'unfollow') {
      return NextResponse.json({ error: 'action must be follow or unfollow' }, { status: 400 })
    }

    if (action === 'follow') {
      await db.topicFollow.create({
        data: { visitorId, topic },
      }).catch(() => { /* already exists */ })
    } else {
      await db.topicFollow.deleteMany({
        where: { visitorId, topic },
      })
    }

    const follows = await db.topicFollow.findMany({
      where: { visitorId },
      select: { topic: true },
    })

    return NextResponse.json({
      success: true,
      topics: follows.map(f => f.topic),
    })
  } catch (error) {
    console.error('Topics POST error:', error)
    return NextResponse.json({ error: 'Failed to process topic' }, { status: 500 })
  }
}
