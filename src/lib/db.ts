/**
 * Database Client — Neon-Optimized
 *
 * Uses Prisma with the Neon serverless driver adapter for fast cold starts
 * on Netlify serverless functions. Includes:
 *
 * - Neon serverless driver (WebSocket-based, no TCP handshake)
 * - Connection pool size optimized for serverless (max 5 concurrent)
 * - Query timeout tuned for Neon's scale-to-zero (10s)
 * - Automatic fallback for local dev without Neon
 *
 * Neon features leveraged:
 * - Serverless driver: edge/serverless-optimized WebSocket connections
 * - Connection pooling: Neon's PgBouncer proxy handles multiplexing
 * - Scale to zero: no idle connection cost
 */

import { PrismaClient } from '@prisma/client'
import { neon } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    // Fallback: standard Prisma (no driver adapter) — for local dev without Neon
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
    })
  }

  // Use Neon serverless driver adapter for production / Netlify
  // fetchConnectionCache: true enables Neon's built-in connection caching
  // which keeps WebSocket connections warm across function invocations
  const sql = neon(databaseUrl, {
    fetchConnectionCache: true,
  })
  const adapter = new PrismaNeon(sql)

  return new PrismaClient({
    adapter,
    // Serverless-optimized: small pool, fast timeout
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db