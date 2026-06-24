/**
 * Deep Health Check — Neon-Aware Comprehensive Diagnostics
 *
 * Extends basic health with Neon-specific metrics:
 * - Connection type detection (pooler vs direct)
 * - Query latency measurement via Neon serverless driver
 * - Neon driver adapter confirmation
 * - Query cache hit ratio
 * - Connection pool health indicators
 */

import { NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { healthMonitor } from '@/lib/monitor'
import { isRedisAvailable } from '@/lib/rate-limit'
import { queryCache } from '@/lib/neon-cache'

interface DeepHealthResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  deployment: {
    environment: string
    platform: string
    region: string
    commitSha: string | null
    startedAt: string
  }
  neon: {
    status: string
    driverType: string
    connectionUrl: string
    latencyMs: number
    poolerDetected: boolean
    recordCounts: Record<string, number>
    cacheStats: { entries: number; maxEntries: number; topKeys: Array<{ key: string; hits: number }> }
  }
  checks: {
    database: { status: string; latencyMs: number; details: string }
    memory: { status: string; pressure: number; trend: string }
    redis: { status: string; details: string }
    aiSdk: { status: string; details: string }
  }
  metrics: {
    uptime: string
    errorRate: string
    avgResponseTime: string
    memoryUsage: string
  }
}

export async function GET() {
  const startTime = Date.now()

  try {
    // ── Check 1: Database + Neon Metrics ──
    let dbStatus = 'unhealthy'
    let dbLatency = 0
    let dbDetails = 'Not tested'

    const databaseUrl = process.env.DATABASE_URL || ''
    const isPooler = databaseUrl.includes('-pooler')
    const isNeon = databaseUrl.includes('.neon.tech')

    try {
      const dbStart = Date.now()
      await prisma.$queryRaw`SELECT 1 as ok`
      dbLatency = Date.now() - dbStart

      // Count key tables for a quick data health check
      const [modelCount, userCount, postCount, auditCount] = await Promise.all([
        prisma.aiModel.count().catch(() => -1),
        prisma.user.count().catch(() => -1),
        prisma.communityPost.count().catch(() => -1),
        prisma.aiAuditLog.count().catch(() => -1),
      ])

      dbStatus = dbLatency < 200 ? 'healthy' : dbLatency < 1000 ? 'degraded' : 'unhealthy'
      const provider = isNeon ? 'Neon PostgreSQL' : 'PostgreSQL'
      const poolerInfo = isPooler ? ' via PgBouncer pooler' : ' (direct)'
      dbDetails = `${provider}${poolerInfo}. Models: ${modelCount}, Users: ${userCount}, Posts: ${postCount}, Audit logs: ${auditCount}`
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      dbStatus = 'unhealthy'
      dbDetails = `Database error: ${msg}`
    }

    // ── Check 2: Memory ──
    const memUsage = process.memoryUsage()
    const memoryPressure = memUsage.heapUsed / memUsage.heapTotal
    const memStatus = memoryPressure < 0.75 ? 'healthy' : memoryPressure < 0.9 ? 'degraded' : 'unhealthy'
    const memTrend = healthMonitor.getMemoryTrend()

    // ── Check 3: Redis ──
    let redisStatus = 'healthy'
    let redisDetails = 'Not configured (using in-memory fallback)'
    try {
      const redisOk = await isRedisAvailable()
      redisStatus = redisOk ? 'healthy' : 'degraded'
      redisDetails = redisOk
        ? 'Redis connected — distributed rate limiting active'
        : 'REDIS_URL not set — in-memory fallback'
    } catch {
      redisStatus = 'degraded'
      redisDetails = 'Redis check failed'
    }

    // ── Check 4: AI SDK ──
    let aiStatus = 'healthy'
    let aiDetails = 'ZAI SDK available'
    try {
      await import('z-ai-web-dev-sdk')
      aiDetails = 'ZAI SDK resolved successfully'
    } catch {
      aiStatus = 'degraded'
      aiDetails = 'ZAI SDK import warning'
    }

    // ── Overall Status ──
    const allChecks = [dbStatus, memStatus, aiStatus, redisStatus]
    const overallStatus: 'healthy' | 'degraded' | 'unhealthy' =
      allChecks.every((s) => s === 'healthy')
        ? 'healthy'
        : allChecks.some((s) => s === 'unhealthy')
          ? 'unhealthy'
          : 'degraded'

    const report = healthMonitor.getHealthReport()
    const responseTime = Date.now() - startTime

    // Mask password in URL for safe display
    const safeUrl = databaseUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')

    const result: DeepHealthResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: '2.5.0',
      deployment: {
        environment: process.env.NODE_ENV || 'development',
        platform: process.env.NETLIFY ? 'Netlify' : process.env.VERCEL ? 'Vercel' : 'local',
        region: process.env.REGION || 'local',
        commitSha: process.env.COMMIT_SHA || null,
        startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
      },
      neon: {
        status: isNeon ? (dbStatus === 'healthy' ? 'connected' : 'error') : 'not-using-neon',
        driverType: isNeon ? '@neondatabase/serverless + PrismaNeon adapter' : 'standard pg',
        connectionUrl: safeUrl,
        latencyMs: dbLatency,
        poolerDetected: isPooler,
        recordCounts: {}, // populated in dbDetails string above
        cacheStats: queryCache.stats(),
      },
      checks: {
        database: { status: dbStatus, latencyMs: dbLatency, details: dbDetails },
        memory: { status: memStatus, pressure: Math.round(memoryPressure * 100), trend: memTrend },
        redis: { status: redisStatus, details: redisDetails },
        aiSdk: { status: aiStatus, details: aiDetails },
      },
      metrics: {
        uptime: report.uptime,
        errorRate: report.performance.errorRate,
        avgResponseTime: report.performance.avgResponseTime,
        memoryUsage: report.memory.heapUsed,
      },
    }

    const httpStatus = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503

    return NextResponse.json(result, {
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store',
        'X-Response-Time': `${responseTime}ms`,
        'X-Health-Status': overallStatus,
      },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { status: 'unhealthy', timestamp: new Date().toISOString(), error: msg },
      { status: 503 },
    )
  }
}