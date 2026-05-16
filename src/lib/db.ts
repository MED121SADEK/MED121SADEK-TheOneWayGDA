/**
 * Database Client — Auto-detects environment
 *
 * - Local development: Uses Prisma with SQLite
 * - Vercel / serverless: Uses universal in-memory database (no file system needed)
 * - If DATABASE_URL is a postgresql:// URL: Uses Prisma with PostgreSQL
 */

import { PrismaClient } from '@prisma/client'
import { getUniversalMemDb } from './universal-mem-db'

const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME
const isPostgres = process.env.DATABASE_URL?.startsWith('postgresql://')

// ─── Prisma client (for local dev or real PostgreSQL) ───
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  return globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : ['error'],
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _db: any

if (isPostgres && !isServerless) {
  // Local dev with PostgreSQL — use Prisma
  _db = createPrismaClient()
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = _db
} else if (isServerless) {
  // Vercel / serverless — use universal in-memory database
  _db = getUniversalMemDb()
} else {
  // Local dev — use Prisma with SQLite
  _db = createPrismaClient()
  if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = _db
}

export const db = _db
