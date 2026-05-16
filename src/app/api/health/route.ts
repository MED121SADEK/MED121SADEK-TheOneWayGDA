import { NextResponse } from 'next/server'
import { healthMonitor, getDependencyHealth } from '@/lib/monitor'
import { healthLog } from '@/lib/api-logger'

/**
 * Enhanced Health Check API — comprehensive system monitoring
 * Returns: system status, memory usage, uptime, performance metrics,
 * security posture, maintenance status, and actionable recommendations.
 */
export async function GET() {
  const end = healthLog.start('GET')
  const startTime = Date.now()

  try {
    healthMonitor.trackRequest(true)

    const report = healthMonitor.getHealthReport()
    const dependencies = getDependencyHealth()
    const responseTime = Date.now() - startTime

    healthMonitor.trackMetric('response_time', responseTime, 'ms')

    end(200)

    return NextResponse.json({
      ...report,
      version: '2.5.0',
      responseTime: `${responseTime}ms`,
      system: {
        platform: process.platform,
        nodeVersion: process.version,
        cpuCount: typeof process !== 'undefined' && typeof process.cpuUsage === 'function' ? 'available' : 'unknown',
      },
      endpoints: {
        ai: '/api/ai',
        scan: '/api/scan',
        clean: '/api/clean',
        validate: '/api/validate',
        projects: '/api/projects',
        updates: '/api/updates',
        modules: '/api/modules',
        health: '/api/health',
      },
      dependencies,
      capabilities: {
        streaming: true,
        caching: true,
        rateLimiting: true,
        inputSanitization: true,
        csrfProtection: true,
        wafEnabled: true,
        autoMaintenance: true,
      },
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store',
        'X-Response-Time': `${responseTime}ms`,
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error: any) {
    healthMonitor.trackRequest(false)
    healthMonitor.logError(`Health check failed: ${error.message}`, 'health-api', 'high')
    end(503, error)

    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    }, {
      status: 503,
      headers: { 'Cache-Control': 'no-cache, no-store' },
    })
  }
}
