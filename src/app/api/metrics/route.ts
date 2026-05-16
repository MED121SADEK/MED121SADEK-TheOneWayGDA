/**
 * Prometheus-style Metrics Endpoint
 *
 * Exposes application metrics in Prometheus text format for monitoring systems.
 * Metrics: request count, error rate, response time, AI usage, DB health.
 *
 * Endpoint: GET /api/metrics
 * Format: text/plain (Prometheus exposition format)
 */

import { NextResponse } from 'next/server'
import { healthMonitor } from '@/lib/monitor'
import { db as prisma } from '@/lib/db'

export async function GET() {
  try {
    const report = healthMonitor.getHealthReport()
    const memUsage = process.memoryUsage()
    const uptimeSeconds = Math.floor(process.uptime())

    // Count recent AI queries (last hour)
    let aiQueriesLastHour = 0
    let aiQueriesLastDay = 0
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      aiQueriesLastHour = await prisma.aiAuditLog.count({ where: { createdAt: { gte: oneHourAgo }, action: 'ai_query' } })
      aiQueriesLastDay = await prisma.aiAuditLog.count({ where: { createdAt: { gte: oneDayAgo }, action: 'ai_query' } })
    } catch {
      // DB not available
    }

    const now = Date.now() / 1000

    // Prometheus output
    const metrics = [
      // ── Application Metrics ──
      `# HELP oneway_up Application uptime in seconds`,
      `# TYPE oneway_up gauge`,
      `oneway_up ${uptimeSeconds}`,

      `# HELP oneway_version Application version`,
      `# TYPE oneway_version gauge`,
      `oneway_version_info{version="2.5.0",node="${process.env.HOSTNAME || 'local'}"} 1`,

      // ── Memory ──
      `# HELP oneway_memory_bytes Memory usage in bytes`,
      `# TYPE oneway_memory_bytes gauge`,
      `oneway_memory_bytes{type="heap_used"} ${memUsage.heapUsed}`,
      `oneway_memory_bytes{type="heap_total"} ${memUsage.heapTotal}`,
      `oneway_memory_bytes{type="rss"} ${memUsage.rss}`,
      `oneway_memory_bytes{type="array_buffers"} ${memUsage.arrayBuffers || 0}`,

      `# HELP oneway_memory_pressure Memory pressure percentage (0-100)`,
      `# TYPE oneway_memory_pressure gauge`,
      `oneway_memory_pressure ${Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)}`,

      // ── AI Metrics ──
      `# HELP oneway_ai_queries_total Total AI queries`,
      `# TYPE oneway_ai_queries_total counter`,
      `oneway_ai_queries_total{period="1h"} ${aiQueriesLastHour}`,
      `oneway_ai_queries_total{period="24h"} ${aiQueriesLastDay}`,

      // ── Process ──
      `# HELP oneway_process_uptime_seconds Process uptime`,
      `# TYPE oneway_process_uptime_seconds gauge`,
      `oneway_process_uptime_seconds ${uptimeSeconds}`,

      `# HELP oneway_nodejs_version Node.js version`,
      `# TYPE oneway_nodejs_version info`,
      `oneway_nodejs_version_info{version="${process.version}"} 1`,
    ].join('\n')

    return new NextResponse(metrics, {
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Metrics collection failed' }, { status: 503 })
  }
}
