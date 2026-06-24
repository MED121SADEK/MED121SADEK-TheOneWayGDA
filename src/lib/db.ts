/**
 * Database Client — Neon-Optimized
 *
 * Uses Prisma with the Neon serverless driver adapter for fast cold starts
 * on Netlify serverless functions. Includes:
 *
 * - Neon serverless driver (WebSocket-based, no TCP handshake)
 * - fetchConnectionCache for warm WebSocket reuse across invocations
 * - Connection string sanitization (strips pooler-incompatible params)
 * - Automatic fallback for local dev without Neon
 */

import { PrismaClient } from '@prisma/client'
import { neon } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Sanitize DATABASE_URL for the Neon serverless driver.
 * - Strips `channel_binding` (incompatible with PgBouncer pooler)
 * - Strips `sslmode` (Neon driver handles TLS natively)
 */
function sanitizeNeonUrl(url: string): string {
  return url
    .replace(/[&?]channel_binding=[^&]*/g, '')
    .replace(/[&?]sslmode=[^&]*/g, '')
    .replace(/\?$/, '') // remove trailing ? if no params left
}

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    // Fallback: standard Prisma (no driver adapter) — for local dev without Neon
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
    })
  }

  const isNeon = databaseUrl.includes('.neon.tech')

  if (!isNeon) {
    // Non-Neon PostgreSQL: use standard Prisma
    return new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
    })
  }

  // Neon serverless driver adapter
  const cleanUrl = sanitizeNeonUrl(databaseUrl)
  const sql = neon(cleanUrl, {
    fetchConnectionCache: true,
  })
  const adapter = new PrismaNeon(sql)

  return new PrismaClient({
    adapter,
    // Keep the original URL for Prisma's own connection management
    // (strips incompatible params for the driver adapter above)
    datasources: {
      db: {
        url: cleanUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
  })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db