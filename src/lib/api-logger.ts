/**
 * API Route Logger — convenience wrapper for structured logging in API routes.
 *
 * Usage:
 *   import { apiRouteLogger } from '@/lib/api-logger'
 *   const log = apiRouteLogger('/api/leaderboard')
 *
 *   export async function GET(req: Request) {
 *     const end = log.start('GET')
 *     try {
 *       // ... handler logic ...
 *       end(200)
 *       return NextResponse.json(data)
 *     } catch (err) {
 *       end(500, err)
 *       return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
 *     }
 *   }
 */

import { logger } from '@/lib/logger'

export function apiRouteLogger(route: string) {
  const routeLogger = logger.child({ route })

  return {
    /** Start timing a request. Returns a function to call with the status code. */
    start(method: string) {
      const startTime = Date.now()
      const requestId = crypto.randomUUID().slice(0, 8)

      return (status: number, error?: unknown) => {
        const duration = Date.now() - startTime
        const isError = status >= 400
        const errorMsg = error instanceof Error ? error.message : undefined

        if (isError) {
          routeLogger.error(`${method} failed`, {
            requestId,
            method,
            status,
            durationMs: duration,
            error: errorMsg,
          })
        } else {
          routeLogger.info(`${method} completed`, {
            requestId,
            method,
            status,
            durationMs: duration,
          })
        }
      }
    },

    /** Log an info message for this route. */
    info(message: string, data?: Record<string, unknown>) {
      routeLogger.info(message, data)
    },

    /** Log a warning for this route. */
    warn(message: string, data?: Record<string, unknown>) {
      routeLogger.warn(message, data)
    },

    /** Log an error for this route. */
    error(message: string, data?: Record<string, unknown>) {
      routeLogger.error(message, data)
    },
  }
}

/** Pre-configured logger instances for common routes */
export const healthLog = apiRouteLogger('/api/health')
export const leaderboardLog = apiRouteLogger('/api/leaderboard')
export const aiLog = apiRouteLogger('/api/ai')
export const communityLog = apiRouteLogger('/api/community')
