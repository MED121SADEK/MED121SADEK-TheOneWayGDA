/**
 * Prometheus-style Metrics Endpoint (Enhanced)
 *
 * Exposes application metrics in Prometheus text format for monitoring systems.
 * Metrics: request count, error rate, response time, AI usage, DB health,
 * deployment history, error log stats.
 *
 * Endpoint: GET /api/metrics
 * Format: text/plain (Prometheus exposition format)
 */

import { NextResponse } from 'next/server'
import { healthMonitor } from '@/lib/monitor'
import { db as prisma } from '@/lib/db'

export async function GET() {
  try {
    const memUsage = process.memoryUsage()
    const uptimeSeconds = Math.floor(process.uptime())

    // Fetch DB stats in parallel
    let aiQueriesLastHour = 0
    let aiQueriesLastDay = 0
    let errorCountLastHour = 0
    let unresolvedErrors = 0
    let deployCountSuccess = 0
    let deployCountFailed = 0
    let automationRunCount = 0
    let workflowCount = 0

    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

      const [
        aiHour,
        aiDay,
        errorsHour,
        errorsOpen,
        deploysOk,
        deploysFail,
        autoRuns,
        workflows,
      ] = await Promise.all([
        prisma.aiAuditLog.count({ where: { createdAt: { gte: oneHourAgo }, action: 'ai_query' } }),
        prisma.aiAuditLog.count({ where: { createdAt: { gte: oneDayAgo }, action: 'ai_query' } }),
        prisma.appErrorLog.count({ where: { createdAt: { gte: oneHourAgo } } }),
        prisma.appErrorLog.count({ where: { resolved: false } }),
        prisma.deployLog.count({ where: { status: 'success' } }),
        prisma.deployLog.count({ where: { status: 'failed' } }),
        prisma.automationLog.count({ where: { status: 'success' } }),
        prisma.workflowPipeline.count(),
      ])

      aiQueriesLastHour = aiHour
      aiQueriesLastDay = aiDay
      errorCountLastHour = errorsHour
      unresolvedErrors = errorsOpen
      deployCountSuccess = deploysOk
      deployCountFailed = deploysFail
      automationRunCount = autoRuns
      workflowCount = workflows
    } catch {
      // DB not available — use defaults
    }

    // ── Health monitor stats ──
    const report = healthMonitor.getHealthReport()
    const errorRate = parseFloat(report.performance?.errorRate || '0')
    const avgResponseTime = parseFloat(report.performance?.avgResponseTime || '0')
    const rpm = parseFloat(report.performance?.requestsPerMinute || '0')

    const metrics = [
      // ── Application Metrics ──
      `# HELP oneway_up Application uptime in seconds`,
      `# TYPE oneway_up gauge`,
      `oneway_up ${uptimeSeconds}`,

      `# HELP oneway_version_info Application version info`,
      `# TYPE oneway_version_info gauge`,
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

      // ── Requests ──
      `# HELP oneway_http_requests_per_minute Current requests per minute`,
      `# TYPE oneway_http_requests_per_minute gauge`,
      `oneway_http_requests_per_minute ${rpm}`,

      `# HELP oneway_http_error_rate Current error rate percentage`,
      `# TYPE oneway_http_error_rate gauge`,
      `oneway_http_error_rate ${errorRate}`,

      `# HELP oneway_http_response_time_avg_ms Average response time in ms`,
      `# TYPE oneway_http_response_time_avg_ms gauge`,
      `oneway_http_response_time_avg_ms ${avgResponseTime}`,

      // ── AI Metrics ──
      `# HELP oneway_ai_queries_total Total AI queries by period`,
      `# TYPE oneway_ai_queries_total counter`,
      `oneway_ai_queries_total{period="1h"} ${aiQueriesLastHour}`,
      `oneway_ai_queries_total{period="24h"} ${aiQueriesLastDay}`,

      // ── Error Tracking ──
      `# HELP oneway_app_errors_total Application errors by period`,
      `# TYPE oneway_app_errors_total gauge`,
      `oneway_app_errors_total{period="1h",resolved="false"} ${errorCountLastHour}`,
      `oneway_app_errors_total{period="all",resolved="false"} ${unresolvedErrors}`,
      `oneway_app_errors_total{period="all",resolved="true"} 0`,

      // ── Deployment Metrics ──
      `# HELP oneway_deploys_total Total deployments by status`,
      `# TYPE oneway_deploys_total counter`,
      `oneway_deploys_total{status="success"} ${deployCountSuccess}`,
      `oneway_deploys_total{status="failed"} ${deployCountFailed}`,

      // ── Workflow & Automation Metrics ──
      `# HELP oneway_workflows_total Total workflow pipelines`,
      `# TYPE oneway_workflows_total gauge`,
      `oneway_workflows_total ${workflowCount}`,

      `# HELP oneway_automation_runs_total Total successful automation runs`,
      `# TYPE oneway_automation_runs_total counter`,
      `oneway_automation_runs_total ${automationRunCount}`,

      // ── Process ──
      `# HELP oneway_process_uptime_seconds Process uptime`,
      `# TYPE oneway_process_uptime_seconds gauge`,
      `oneway_process_uptime_seconds ${uptimeSeconds}`,

      `# HELP oneway_nodejs_version_info Node.js version`,
      `# TYPE oneway_nodejs_version_info info`,
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
