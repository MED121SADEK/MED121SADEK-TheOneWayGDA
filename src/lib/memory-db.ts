/**
 * In-Memory Database Fallback
 *
 * Stores data in memory — works on any serverless platform without a database.
 * Data resets on each cold start. Perfect for demo/evaluation.
 */

interface MemUser {
  id: string; email: string; password: string; name: string | null
  role: string; preferences: string | null; isOnboarded: boolean
  createdAt: Date; updatedAt: Date; lastSeen: Date
}

interface MemSession {
  id: string; userId: string; token: string
  ipAddress: string | null; userAgent: string | null; expiresAt: Date
}

const users = new Map<string, MemUser>()
const sessionByToken = new Map<string, MemSession>()
const activities: { id: string; userId: string; type: string; details: string | null; ipAddress: string | null; createdAt: Date }[] = []
const visitors = new Map<string, { id: string; email: string; name: string | null; status: string }>()

function cuid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
}

export const memDb = {
  user: {
    findUnique: async (args: { where: { id?: string; email?: string } }) => {
      if (args.where.email) { for (const u of users.values()) if (u.email === args.where.email) return u; return null }
      if (args.where.id) return users.get(args.where.id) || null
      return null
    },
    create: async (args: { data: Record<string, unknown> }) => {
      const now = new Date()
      const user: MemUser = { id: String(args.data.id || cuid()), email: String(args.data.email), password: String(args.data.password), name: args.data.name ? String(args.data.name) : null, role: String(args.data.role || 'user'), preferences: args.data.preferences ? String(args.data.preferences) : null, isOnboarded: Boolean(args.data.isOnboarded), createdAt: now, updatedAt: now, lastSeen: now }
      users.set(user.id, user)
      return user
    },
    update: async (args: { where: { id: string }; data: Record<string, unknown> }) => {
      const user = users.get(args.where.id)
      if (!user) throw new Error('User not found')
      user.lastSeen = new Date()
      return user
    },
  },
  userSession: {
    findUnique: async (args: { where: { token?: string; id?: string } }) => {
      if (args.where.token) return sessionByToken.get(args.where.token) || null
      return null
    },
    create: async (args: { data: Record<string, unknown> }) => {
      const session: MemSession = { id: cuid(), userId: String(args.data.userId), token: String(args.data.token), ipAddress: args.data.ipAddress ? String(args.data.ipAddress) : null, userAgent: args.data.userAgent ? String(args.data.userAgent) : null, expiresAt: args.data.expiresAt instanceof Date ? args.data.expiresAt : new Date(String(args.data.expiresAt)) }
      sessionByToken.set(session.token, session)
      return session
    },
    delete: async (args: { where: { token?: string; id?: string } }) => {
      if (args.where.token) sessionByToken.delete(args.where.token)
    },
    deleteMany: async () => {},
  },
  userActivity: {
    create: async (args: { data: Record<string, unknown> }) => {
      activities.push({ id: cuid(), userId: String(args.data.userId), type: String(args.data.type), details: args.data.details ? String(args.data.details) : null, ipAddress: args.data.ipAddress ? String(args.data.ipAddress) : null, createdAt: new Date() })
      return { id: activities[activities.length - 1].id }
    },
  },
  visitor: {
    upsert: async (args: { where: { email: string }; update: Record<string, unknown>; create: Record<string, unknown> }) => {
      const email = args.where.email
      const existing = visitors.get(email)
      if (existing) { existing.name = args.update.name ? String(args.update.name) : null; existing.status = 'active' }
      else visitors.set(email, { id: cuid(), email: String(args.create.email || email), name: args.create.name ? String(args.create.name) : null, status: 'active' })
      return { email, status: 'active' }
    },
  },
}
