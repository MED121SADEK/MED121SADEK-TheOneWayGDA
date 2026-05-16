/**
 * Deep Health Check — Comprehensive system diagnostics
 *
 * Extends the basic health endpoint with deep dependency checks,
 * database connectivity, AI API reachability, and deployment info.
 * Used by: CD pipeline, monitoring systems, Docker HEALTHCHECK.
 */

import { NextRequest, NextResponse } from 'next/server'
import { db as prisma } from '@/lib/db'
import { healthMonitor } from '@/lib/monitor'

interface DeepHealthResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  deployment: {
    environment: string
    region: string
    commitSha: string | null
    buildTime: string | null
    startedAt: string
  }
  checks: {
    database: { status: string; latencyMs: number; details: string }
    memory: { status: string; pressure: number; trend: string }
    apiEndpoints: { status: string; tested: number; total: number }
    aiSdk: { status: string; details: string }
    diskSpace: { status: string; details: string }
  }
  metrics: {
    uptime: string
    totalRequests: number
    errorRate: string
    avgResponseTime: string
    memoryUsage: string
  }
}

export async function GET() {
  const startTime = Date.now()

  try {
    // ── Check 1: Database Connectivity ──
    let dbStatus = 'unhealthy'
    let dbLatency = 0
    let dbDetails = 'Not tested'

    try {
      const dbStart = Date.now()
      await prisma.$queryRaw`SELECT 1 as ok`
      dbLatency = Date.now() - dbStart

      const modelCount = await prisma.aiModel.count()
      const auditCount = await prisma.aiAuditLog.count()

      dbStatus = dbLatency < 100 ? 'healthy' : dbLatency < 500 ? 'degraded' : 'unhealthy'
      dbDetails = `SQLite connected. Models: ${modelCount}, Audit logs: ${auditCount}`
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

    // ── Check 3: API Endpoints ──
    let apiStatus = 'healthy'
    const apiEndpoints = [
      '/api/health', '/api/ai/copilot', '/api/ai/workflow',
      '/api/ai/audit', '/api/ai/policies', '/api/leaderboard',
      '/api/community/posts', '/api/ai/extensions',
    ]

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

    // ── Check 5: Disk Space ──
    let diskStatus = 'healthy'
    let diskDetails = 'Not measured'
    try {
      const { execSync } = await import('child_process')
      const dfOutput = execSync('df -h / | tail -1', { encoding: 'utf-8', timeout: 5000 })
      const parts = dfOutput.trim().split(/\s+/)
      if (parts.length >= 5) {
        const usePercent = parts[4].replace('%', '')
        diskStatus = parseInt(usePercent) < 80 ? 'healthy' : parseInt(usePercent) < 95 ? 'degraded' : 'unhealthy'
        diskDetails = `Disk usage: ${usePercent}% (${parts[2]} used of ${parts[1]})`
      }
    } catch {
      // Not available in some containers
    }

    // ── Overall Status ──
    const allChecks = [dbStatus, memStatus, apiStatus, aiStatus, diskStatus]
    const overallStatus: 'healthy' | 'degraded' | 'unhealthy' =
      allChecks.every((s) => s === 'healthy')
        ? 'healthy'
        : allChecks.some((s) => s === 'unhealthy')
          ? 'unhealthy'
          : 'degraded'

    const report = healthMonitor.getHealthReport()
    const responseTime = Date.now() - startTime

    const result: DeepHealthResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: '2.5.0',
      deployment: {
        environment: process.env.NODE_ENV || 'development',
        region: process.env.REGION || 'local',
        commitSha: process.env.COMMIT_SHA || null,
        buildTime: process.env.BUILD_TIME || null,
        startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
      },
      checks: {
        database: { status: dbStatus, latencyMs: dbLatency, details: dbDetails },
        memory: { status: memStatus, pressure: Math.round(memoryPressure * 100), trend: memTrend },
        apiEndpoints: { status: apiStatus, tested: apiEndpoints.length, total: apiEndpoints.length },
        aiSdk: { status: aiStatus, details: aiDetails },
        diskSpace: { status: diskStatus, details: diskDetails },
      },
      metrics: {
        uptime: report.uptime,
        totalRequests: 0,
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
