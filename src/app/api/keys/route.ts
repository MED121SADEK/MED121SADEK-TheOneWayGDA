import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getTokenFromRequest } from '@/lib/auth'
import { apiRouteLogger } from '@/lib/api-logger'
import { createHash, randomBytes } from 'crypto'

const log = apiRouteLogger('/api/keys')

// Helper: authenticate and return user session
async function authenticate(request: NextRequest) {
  const token = getTokenFromRequest(request)
  if (!token) return null

  const session = await db.userSession.findUnique({
    where: { token },
    include: { user: true },
  })

  if (!session || session.expiresAt < new Date()) {
    if (session) await db.userSession.delete({ where: { id: session.id } })
    return null
  }

  return session
}

// GET /api/keys — List user's API keys
export async function GET(request: NextRequest) {
  const end = log.start('GET')
  try {
    const session = await authenticate(request)
    if (!session) {
      end(401)
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const keys = await db.apiKey.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        rateLimit: true,
        lastUsed: true,
        requestCount: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
      },
    })

    // Mask prefix for display: "onw_a3f8..."
    const maskedKeys = keys.map(key => ({
      ...key,
      prefix: `${key.prefix}...`,
    }))

    end(200)
    return NextResponse.json({ success: true, data: maskedKeys })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ success: false, error: 'Failed to fetch API keys' }, { status: 500 })
  }
}

// POST /api/keys — Create new API key
export async function POST(request: NextRequest) {
  const end = log.start('POST')
  try {
    const session = await authenticate(request)
    if (!session) {
      end(401)
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, scopes, rateLimit, expiresAt } = body

    if (!name?.trim()) {
      end(400)
      return NextResponse.json({ success: false, error: 'API key name is required' }, { status: 400 })
    }

    if (name.trim().length > 100) {
      end(400)
      return NextResponse.json({ success: false, error: 'API key name is too long (max 100 chars)' }, { status: 400 })
    }

    // Enforce max 10 keys per user
    const existingCount = await db.apiKey.count({
      where: { userId: session.userId },
    })
    if (existingCount >= 10) {
      end(400)
      return NextResponse.json(
        { success: false, error: 'Maximum of 10 API keys reached. Please delete an existing key first.' },
        { status: 400 }
      )
    }

    // Generate key: onw_ + 32 random hex chars
    const rawKey = `onw_${randomBytes(16).toString('hex')}`
    const prefix = rawKey.slice(0, 8) // "onw_a3f8"
    const keyHash = createHash('sha256').update(rawKey).digest('hex')

    // Validate scopes
    const validScopes = ['read', 'write', 'admin']
    const parsedScopes = Array.isArray(scopes)
      ? scopes.filter((s: string) => validScopes.includes(s))
      : ['read']

    // Validate rate limit
    const parsedRateLimit = typeof rateLimit === 'number' && rateLimit > 0 ? Math.min(rateLimit, 10000) : 100

    // Validate expiresAt
    let parsedExpiresAt: Date | null = null
    if (expiresAt) {
      const d = new Date(expiresAt)
      if (!isNaN(d.getTime()) && d > new Date()) {
        parsedExpiresAt = d
      }
    }

    const apiKey = await db.apiKey.create({
      data: {
        userId: session.userId,
        name: name.trim(),
        prefix,
        keyHash,
        scopes: JSON.stringify(parsedScopes),
        rateLimit: parsedRateLimit,
        expiresAt: parsedExpiresAt,
      },
    })

    // Log activity
    await db.userActivity.create({
      data: {
        userId: session.userId,
        type: 'api_key_created',
        details: JSON.stringify({ keyId: apiKey.id, keyName: apiKey.name, prefix }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      },
    })

    // Return the FULL key only once — after this response it is never accessible again
    end(201)
    return NextResponse.json(
      {
        success: true,
        data: {
          id: apiKey.id,
          name: apiKey.name,
          prefix: `${apiKey.prefix}...`,
          key: rawKey, // FULL key — shown only once
          scopes: parsedScopes,
          rateLimit: apiKey.rateLimit,
          expiresAt: apiKey.expiresAt,
          createdAt: apiKey.createdAt,
          warning: 'Save this API key now. It cannot be retrieved again.',
        },
      },
      { status: 201 }
    )
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ success: false, error: 'Failed to create API key' }, { status: 500 })
  }
}

// DELETE /api/keys — Delete an API key
export async function DELETE(request: NextRequest) {
  const end = log.start('DELETE')
  try {
    const session = await authenticate(request)
    if (!session) {
      end(401)
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { keyId } = body

    if (!keyId) {
      end(400)
      return NextResponse.json({ success: false, error: 'keyId is required' }, { status: 400 })
    }

    // Verify the key belongs to the current user
    const existingKey = await db.apiKey.findUnique({
      where: { id: keyId },
      select: { id: true, userId: true, name: true },
    })

    if (!existingKey) {
      end(404)
      return NextResponse.json({ success: false, error: 'API key not found' }, { status: 404 })
    }

    if (existingKey.userId !== session.userId) {
      end(403)
      return NextResponse.json({ success: false, error: 'You can only delete your own API keys' }, { status: 403 })
    }

    await db.apiKey.delete({ where: { id: keyId } })

    // Log activity
    await db.userActivity.create({
      data: {
        userId: session.userId,
        type: 'api_key_deleted',
        details: JSON.stringify({ keyId, keyName: existingKey.name }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      },
    })

    end(200)
    return NextResponse.json({ success: true, message: 'API key deleted successfully' })
  } catch (error: unknown) {
    end(500, error)
    return NextResponse.json({ success: false, error: 'Failed to delete API key' }, { status: 500 })
  }
}
