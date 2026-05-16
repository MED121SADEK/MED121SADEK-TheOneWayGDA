/**
 * Vercel Postgres (AWS RDS) Connection
 *
 * Uses @vercel/postgres which automatically handles IAM authentication
 * when the AWS_* environment variables are set via Vercel's RDS integration.
 */

import { sql } from '@vercel/postgres'

// ── Helpers ──
function cuid(): string {
  const ts = Date.now().toString(36)
  const rand = Math.random().toString(36).slice(2, 10)
  return `${ts}${rand}`
}

interface DbUser {
  id: string; email: string; password: string; name: string | null
  image: string | null; role: string; bio: string | null; company: string | null
  location: string | null; website: string | null; skills: string | null
  preferences: string | null; isOnboarded: boolean
  createdAt: Date; updatedAt: Date; lastSeen: Date
}

interface DbSession {
  id: string; userId: string; token: string; ipAddress: string | null
  userAgent: string | null; expiresAt: Date; createdAt: Date
}

function rowToUser(row: Record<string, unknown>): DbUser {
  return {
    id: String(row.id), email: String(row.email), password: String(row.password),
    name: row.name ? String(row.name) : null,
    image: row.image ? String(row.image) : null,
    role: row.role ? String(row.role) : 'user',
    bio: row.bio ? String(row.bio) : null,
    company: row.company ? String(row.company) : null,
    location: row.location ? String(row.location) : null,
    website: row.website ? String(row.website) : null,
    skills: row.skills ? String(row.skills) : null,
    preferences: row.preferences ? String(row.preferences) : null,
    isOnboarded: Boolean(row.is_onboarded) || false,
    createdAt: row.created_at ? new Date(String(row.created_at)) : new Date(),
    updatedAt: row.updated_at ? new Date(String(row.updated_at)) : new Date(),
    lastSeen: row.last_seen ? new Date(String(row.last_seen)) : new Date(),
  }
}

function rowToSession(row: Record<string, unknown>): DbSession {
  return {
    id: String(row.id), userId: String(row.user_id), token: String(row.token),
    ipAddress: row.ip_address ? String(row.ip_address) : null,
    userAgent: row.user_agent ? String(row.user_agent) : null,
    expiresAt: new Date(String(row.expires_at)),
    createdAt: row.created_at ? new Date(String(row.created_at)) : new Date(),
  }
}

// ── Schema initialization ──
let schemaInit = false

async function ensureSchema() {
  if (schemaInit) return
  try {
    await sql`CREATE TABLE IF NOT EXISTS "User" (
      "id" TEXT PRIMARY KEY, "email" TEXT NOT NULL UNIQUE, "password" TEXT NOT NULL,
      "name" TEXT, "image" TEXT, "role" TEXT DEFAULT 'user', "bio" TEXT,
      "company" TEXT, "location" TEXT, "website" TEXT, "skills" TEXT,
      "preferences" TEXT, "isOnboarded" BOOLEAN DEFAULT false,
      "createdAt" TIMESTAMP DEFAULT NOW(), "updatedAt" TIMESTAMP DEFAULT NOW(),
      "lastSeen" TIMESTAMP DEFAULT NOW()
    )`
    await sql`CREATE TABLE IF NOT EXISTS "UserSession" (
      "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "token" TEXT NOT NULL UNIQUE, "ipAddress" TEXT, "userAgent" TEXT,
      "expiresAt" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP DEFAULT NOW()
    )`
    await sql`CREATE TABLE IF NOT EXISTS "UserActivity" (
      "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "type" TEXT NOT NULL, "details" TEXT, "ipAddress" TEXT,
      "createdAt" TIMESTAMP DEFAULT NOW()
    )`
    await sql`CREATE TABLE IF NOT EXISTS "Visitor" (
      "id" TEXT PRIMARY KEY, "email" TEXT NOT NULL UNIQUE, "name" TEXT,
      "visitorType" TEXT DEFAULT 'general', "status" TEXT DEFAULT 'pending',
      "createdAt" TIMESTAMP DEFAULT NOW(), "lastSeen" TIMESTAMP DEFAULT NOW()
    )`
    schemaInit = true
    console.log('[RDS] Schema ready')
  } catch (e) {
    console.error('[RDS] Schema init failed:', e)
    throw e
  }
}

export const rdsDb = {
  user: {
    findUnique: async (args: { where: { id?: string; email?: string } }): Promise<DbUser | null> => {
      await ensureSchema()
      if (args.where.email) {
        const r = await sql`SELECT * FROM "User" WHERE email = ${args.where.email} LIMIT 1`
        return r.rows.length ? rowToUser(r.rows[0] as Record<string, unknown>) : null
      }
      if (args.where.id) {
        const r = await sql`SELECT * FROM "User" WHERE id = ${args.where.id} LIMIT 1`
        return r.rows.length ? rowToUser(r.rows[0] as Record<string, unknown>) : null
      }
      return null
    },
    create: async (args: { data: Record<string, unknown> }): Promise<DbUser> => {
      await ensureSchema()
      const id = String(args.data.id || cuid())
      const name = args.data.name ? String(args.data.name) : null
      const prefs = args.data.preferences ? String(args.data.preferences) : null
      await sql`INSERT INTO "User" (id, email, password, name, role, preferences, "isOnboarded")
        VALUES (${id}, ${String(args.data.email)}, ${String(args.data.password)}, ${name}, ${String(args.data.role || 'user')}, ${prefs}, ${Boolean(args.data.isOnboarded)})`
      return (await rdsDb.user.findUnique({ where: { id } }))!
    },
    update: async (args: { where: { id: string }; data: Record<string, unknown> }): Promise<DbUser> => {
      await ensureSchema()
      await sql`UPDATE "User" SET "lastSeen" = NOW() WHERE id = ${args.where.id}`
      return (await rdsDb.user.findUnique({ where: { id: args.where.id } }))!
    },
  },
  userSession: {
    findUnique: async (args: { where: { token?: string; id?: string } }): Promise<DbSession | null> => {
      await ensureSchema()
      if (args.where.token) {
        const r = await sql`SELECT * FROM "UserSession" WHERE token = ${args.where.token} LIMIT 1`
        return r.rows.length ? rowToSession(r.rows[0] as Record<string, unknown>) : null
      }
      return null
    },
    create: async (args: { data: Record<string, unknown> }): Promise<DbSession> => {
      await ensureSchema()
      const id = cuid()
      const exp = args.data.expiresAt instanceof Date ? args.data.expiresAt.toISOString() : String(args.data.expiresAt)
      const ip = args.data.ipAddress ? String(args.data.ipAddress) : null
      const ua = args.data.userAgent ? String(args.data.userAgent) : null
      await sql`INSERT INTO "UserSession" (id, "userId", token, "ipAddress", "userAgent", "expiresAt")
        VALUES (${id}, ${String(args.data.userId)}, ${String(args.data.token)}, ${ip}, ${ua}, ${exp}::timestamptz)`
      return (await rdsDb.userSession.findUnique({ where: { token: String(args.data.token) } }))!
    },
    delete: async (args: { where: { token?: string; id?: string } }): Promise<void> => {
      await ensureSchema()
      if (args.where.token) await sql`DELETE FROM "UserSession" WHERE token = ${args.where.token}`
      else if (args.where.id) await sql`DELETE FROM "UserSession" WHERE id = ${args.where.id}`
    },
    deleteMany: async (): Promise<void> => {},
  },
  userActivity: {
    create: async (args: { data: Record<string, unknown> }): Promise<{ id: string }> => {
      await ensureSchema()
      const id = cuid()
      await sql`INSERT INTO "UserActivity" (id, "userId", type, details, "ipAddress")
        VALUES (${id}, ${String(args.data.userId)}, ${String(args.data.type)}, ${args.data.details ? String(args.data.details) : null}, ${args.data.ipAddress ? String(args.data.ipAddress) : null})`
      return { id }
    },
  },
  visitor: {
    upsert: async (args: { where: { email: string }; update: Record<string, unknown>; create: Record<string, unknown> }): Promise<{ email: string; status: string }> => {
      await ensureSchema()
      const email = args.where.email
      const existing = await sql`SELECT id FROM "Visitor" WHERE email = ${email} LIMIT 1`
      if (existing.rows.length > 0) {
        await sql`UPDATE "Visitor" SET name = ${args.update.name ? String(args.update.name) : null}, status = 'active', "lastSeen" = NOW() WHERE email = ${email}`
      } else {
        const id = cuid()
        await sql`INSERT INTO "Visitor" (id, email, name, status) VALUES (${id}, ${String(args.create.email || email)}, ${args.create.name ? String(args.create.name) : null}, ${String(args.create.status || 'active')})`
      }
      return { email, status: 'active' }
    },
  },
}

export function isUsingRDS(): boolean {
  return !!(process.env.POSTGRES_URL || (process.env.AWS_REGION && process.env.PGHOST))
}
