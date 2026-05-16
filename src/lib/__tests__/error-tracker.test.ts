import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    _store: () => store,
  }
})()

let ErrorTracker: typeof import('../error-tracker').ErrorTracker

beforeEach(async () => {
  localStorageMock.clear()
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()

  vi.stubGlobal('localStorage', localStorageMock)
  vi.stubGlobal('navigator', { userAgent: 'test-user-agent' })
  vi.stubGlobal('window', {
    location: { href: 'http://localhost:3000/test' },
    onerror: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })

  // Reset modules to clear module-level state (isInitialized, errorBuffer)
  vi.resetModules()
  const mod = await import('../error-tracker')
  ErrorTracker = mod.ErrorTracker
})

// ── Tests ──────────────────────────────────────────────────

describe('ErrorTracker', () => {
  describe('init', () => {
    it('should set up global error handlers on window', () => {
      ErrorTracker.init()

      expect(window.onerror).toBeDefined()
      expect(window.addEventListener).toHaveBeenCalledWith(
        'unhandledrejection',
        expect.any(Function)
      )
    })

    it('should not re-initialize if already initialized', () => {
      ErrorTracker.init()
      const addEventListenerCalls = (window.addEventListener as ReturnType<typeof vi.fn>).mock.calls.length

      ErrorTracker.init()

      // addEventListener should not have been called again
      expect((window.addEventListener as ReturnType<typeof vi.fn>).mock.calls.length).toBe(addEventListenerCalls)
    })

    it('should preload stored errors from localStorage into memory', () => {
      const storedError = {
        id: 'stored-1',
        timestamp: new Date().toISOString(),
        message: 'Stored error',
        url: 'http://localhost',
        userAgent: 'test',
        category: 'runtime',
        source: 'manual',
      }
      localStorageMock.setItem('oneway-error-tracker', JSON.stringify([storedError]))

      ErrorTracker.init()

      const errors = ErrorTracker.getErrors()
      expect(errors).toHaveLength(1)
      expect(errors[0].id).toBe('stored-1')
    })
  })

  describe('error categorization', () => {
    it('should categorize network errors correctly', () => {
      const result = ErrorTracker.trackError('Failed to fetch data from API', {
        source: 'manual',
      })
      expect(result.category).toBe('network')
    })

    it('should categorize network errors by timeout keyword', () => {
      const result = ErrorTracker.trackError('Request timeout exceeded', {
        source: 'manual',
      })
      expect(result.category).toBe('network')
    })

    it('should categorize auth errors correctly', () => {
      const result = ErrorTracker.trackError('401 Unauthorized access', {
        source: 'manual',
      })
      expect(result.category).toBe('auth')
    })

    it('should categorize auth errors by token keyword', () => {
      const result = ErrorTracker.trackError('Session token expired', {
        source: 'manual',
      })
      expect(result.category).toBe('auth')
    })

    it('should categorize UI errors correctly', () => {
      const result = ErrorTracker.trackError('Component render failed', {
        source: 'react',
      })
      expect(result.category).toBe('ui')
    })

    it('should categorize hydration errors as UI', () => {
      const result = ErrorTracker.trackError('Hydration mismatch detected', {
        source: 'manual',
      })
      expect(result.category).toBe('ui')
    })

    it('should categorize generic errors as runtime', () => {
      const result = ErrorTracker.trackError('Something unexpected happened', {
        source: 'manual',
      })
      expect(result.category).toBe('runtime')
    })

    it('should categorize unhandledrejection source as network', () => {
      const result = ErrorTracker.trackError('Random rejection error', {
        source: 'unhandledrejection',
      })
      expect(result.category).toBe('network')
    })
  })

  describe('getErrorStats', () => {
    it('should return zero stats when no errors exist', () => {
      ErrorTracker.clear()
      const stats = ErrorTracker.getErrorStats()

      expect(stats.total).toBe(0)
      expect(stats.lastHour).toBe(0)
      expect(stats.lastDay).toBe(0)
      expect(stats.byCategory.runtime).toBe(0)
      expect(stats.byCategory.network).toBe(0)
      expect(stats.byCategory.auth).toBe(0)
      expect(stats.byCategory.ui).toBe(0)
    })

    it('should count errors by category correctly', () => {
      ErrorTracker.clear()

      ErrorTracker.trackError('Failed to fetch', { source: 'manual' })
      ErrorTracker.trackError('401 Unauthorized', { source: 'manual' })
      ErrorTracker.trackError('Component render error', { source: 'react' })
      ErrorTracker.trackError('Generic crash', { source: 'manual' })

      const stats = ErrorTracker.getErrorStats()

      expect(stats.total).toBe(4)
      expect(stats.byCategory.network).toBe(1)
      expect(stats.byCategory.auth).toBe(1)
      expect(stats.byCategory.ui).toBe(1)
      expect(stats.byCategory.runtime).toBe(1)
    })

    it('should count errors by source correctly', () => {
      ErrorTracker.clear()

      ErrorTracker.trackError('err1', { source: 'manual' })
      ErrorTracker.trackError('err2', { source: 'manual' })
      ErrorTracker.trackError('err3', { source: 'react' })

      const stats = ErrorTracker.getErrorStats()

      expect(stats.bySource.manual).toBe(2)
      expect(stats.bySource.react).toBe(1)
    })

    it('should return stable trend when fewer than 4 errors', () => {
      ErrorTracker.clear()

      ErrorTracker.trackError('err1', { source: 'manual' })
      ErrorTracker.trackError('err2', { source: 'manual' })

      const stats = ErrorTracker.getErrorStats()
      expect(stats.recentTrend).toBe('stable')
    })

    it('should correctly track lastHour and lastDay counts', () => {
      ErrorTracker.clear()

      ErrorTracker.trackError('Recent error', { source: 'manual' })

      const stats = ErrorTracker.getErrorStats()
      expect(stats.lastHour).toBe(1)
      expect(stats.lastDay).toBe(1)
    })
  })

  describe('clear', () => {
    it('should remove all errors from memory and localStorage', () => {
      ErrorTracker.clear()
      ErrorTracker.trackError('Test error', { source: 'manual' })
      expect(ErrorTracker.getErrors().length).toBeGreaterThan(0)

      ErrorTracker.clear()

      expect(ErrorTracker.getErrors()).toHaveLength(0)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('oneway-error-tracker')
    })
  })

  describe('getErrors', () => {
    it('should return errors sorted by timestamp (newest first)', () => {
      ErrorTracker.clear()

      ErrorTracker.trackError('First error', { source: 'manual' })

      // Advance time to ensure different timestamps
      vi.useFakeTimers()
      vi.advanceTimersByTime(1000)
      vi.useRealTimers()

      ErrorTracker.trackError('Second error', { source: 'manual' })

      const errors = ErrorTracker.getErrors()
      expect(errors[0].message).toBe('Second error')
      expect(errors[1].message).toBe('First error')
    })

    it('should include extra data when provided', () => {
      ErrorTracker.clear()

      const tracked = ErrorTracker.trackError('Module error', {
        source: 'manual',
        module: 'leaderboard',
        extra: { key: 'value' },
      })

      expect(tracked.extra).toBeDefined()
      expect(tracked.extra?.module).toBe('leaderboard')
      expect(tracked.extra?.key).toBe('value')
    })

    it('should persist tracked errors to localStorage', () => {
      ErrorTracker.clear()

      ErrorTracker.trackError('Persistent error', { source: 'manual' })

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'oneway-error-tracker',
        expect.stringContaining('Persistent error')
      )
    })
  })
})
