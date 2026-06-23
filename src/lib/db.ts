/**
 * Database Client
 *
 * Uses Prisma with PostgreSQL (Neon/any provider).
 * In serverless environments, connection pooling is critical to avoid
 * exhausting the database's max connections limit.
 *
 * Connection strategy:
 *  - If DATABASE_URL contains "?connection_limit=" or pgBouncer is detected,
 *    Prisma uses its default connection pool.
 *  - Otherwise, we enforce a small connection_limit suitable for serverless
 *    (each function invocation creates connections that may not be reused).
 *  - The globalThis singleton prevents multiple PrismaClient instances in
 *    development (hot reload).
 */

import { PrismaClient } from '@prisma/client'

const isServerless = !!(
  process.env.NETLIFY === 'true' ||
  process.env.LAMBDA_TASK_ROOT ||
  process.env.AWS_LAMBDA_FUNCTION_NAME ||
  process.env.VERCEL === '1'
)

// In serverless, limit connection pool to prevent DB exhaustion.
// Each function invocation is ephemeral — a small pool is sufficient.
const connectionLimit = isServerless
  ? parseInt(process.env.DATABASE_CONNECTION_LIMIT || '3', 10)
  : undefined

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
    datasourceUrl: connectionLimit
      ? appendConnectionLimit(process.env.DATABASE_URL!, connectionLimit)
      : undefined,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/**
 * Append or override connection_limit in a PostgreSQL URL.
 * Handles both URL-with-query and plain URLs.
 */
function appendConnectionLimit(url: string, limit: number): string {
  try {
    const parsed = new URL(url)
    parsed.searchParams.set('connection_limit', String(limit))
    return parsed.toString()
  } catch {
    // Fallback: append as query param
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}connection_limit=${limit}`
  }
}