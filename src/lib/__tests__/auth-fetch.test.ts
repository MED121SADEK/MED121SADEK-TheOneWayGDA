import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    _store: () => store,
    _reset() { store = {} },
  }
})()

let authFetch: typeof import('../auth-fetch')['authFetch']
let createAuthEventSource: typeof import('../auth-fetch')['createAuthEventSource']
let toastWarning: ReturnType<typeof vi.fn>

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: { warning: vi.fn() },
}))

// Mock global fetch
const mockFetch = vi.fn()

beforeEach(async () => {
  vi.resetModules()
  localStorageMock._reset()
  localStorageMock.getItem.mockClear()
  localStorageMock.getItem.mockImplementation((key: string) => localStorageMock._store()[key] ?? null)
  vi.stubGlobal('localStorage', localStorageMock)
  vi.stubGlobal('window', { location: { href: 'http://localhost:3000' } })
  vi.stubGlobal('fetch', mockFetch)
  mockFetch.mockReset()

  const mod = await import('../auth-fetch')
  authFetch = mod.authFetch
  createAuthEventSource = mod.createAuthEventSource

  const { toast } = await import('sonner')
  toastWarning = toast.warning as ReturnType<typeof vi.fn>
  toastWarning.mockClear()
})

afterEach(() => {
  vi.restoreAllMocks()
})

// ── Helpers ──────────────────────────────────────────────────

function makeResponse(status: number, headers: Record<string, string> = {}, body?: object) {
  return new Response(body ? JSON.stringify(body) : null, {
    status,
    headers: new Headers(headers),
  })
}

// ── Tests ──────────────────────────────────────────────────

describe('authFetch', () => {
  describe('token injection', () => {
    it('should add Authorization header when token exists in localStorage', async () => {
      localStorageMock._store()['oneway-auth-token'] = 'my-secret-token'
      mockFetch.mockResolvedValue(makeResponse(200))

      await authFetch('/api/test')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const headers = mockFetch.mock.calls[0][1]?.headers
      expect(headers.get('Authorization')).toBe('Bearer my-secret-token')
    })

    it('should not add Authorization header when no token exists', async () => {
      mockFetch.mockResolvedValue(makeResponse(200))

      await authFetch('/api/test')

      const headers = mockFetch.mock.calls[0][1]?.headers
      // When no token, the Authorization header is not set
      expect(headers.get('Authorization')).toBeNull()
    })

    it('should not override an existing Authorization header', async () => {
      localStorageMock._store()['oneway-auth-token'] = 'token-from-storage'
      mockFetch.mockResolvedValue(makeResponse(200))

      await authFetch('/api/test', {
        headers: new Headers({ 'Authorization': 'Bearer custom-token' }),
      })

      const headers = mockFetch.mock.calls[0][1]?.headers
      expect(headers.get('Authorization')).toBe('Bearer custom-token')
    })

    it('should pass through other headers', async () => {
      mockFetch.mockResolvedValue(makeResponse(200))

      await authFetch('/api/test', {
        headers: { 'Content-Type': 'application/json', 'X-Custom': 'value' },
      })

      const headers = mockFetch.mock.calls[0][1]?.headers
      expect(headers.get('Content-Type')).toBe('application/json')
      expect(headers.get('X-Custom')).toBe('value')
    })
  })

  describe('URL token cleanup', () => {
    it('should remove ?token=... from URLs (legacy cleanup)', async () => {
      mockFetch.mockResolvedValue(makeResponse(200))

      await authFetch('/api/test?token=legacy-secret&other=1')

      const calledUrl = mockFetch.mock.calls[0][0]
      expect(calledUrl).not.toContain('token=legacy-secret')
      expect(calledUrl).toContain('other=1')
    })

    it('should remove &token=... from URLs', async () => {
      mockFetch.mockResolvedValue(makeResponse(200))

      await authFetch('/api/test?other=1&token=legacy-secret')

      const calledUrl = mockFetch.mock.calls[0][0]
      expect(calledUrl).not.toContain('token=legacy-secret')
      expect(calledUrl).toContain('other=1')
    })

    it('should handle token as the only query parameter (removes ?)', async () => {
      mockFetch.mockResolvedValue(makeResponse(200))

      await authFetch('/api/test?token=only-param')

      const calledUrl = mockFetch.mock.calls[0][0]
      expect(calledUrl).not.toContain('token=')
      expect(calledUrl).not.toContain('?')
    })

    it('should pass through URLs with no token parameter', async () => {
      mockFetch.mockResolvedValue(makeResponse(200))

      await authFetch('/api/test?foo=bar&baz=qux')

      const calledUrl = mockFetch.mock.calls[0][0]
      expect(calledUrl).toContain('foo=bar')
      expect(calledUrl).toContain('baz=qux')
    })
  })

  describe('429 rate-limit handling', () => {
    beforeEach(() => {
      toastWarning.mockClear()
    })

    it('should show a toast when receiving a 429 response', async () => {
      mockFetch.mockResolvedValue(
        makeResponse(429, { 'Retry-After': '30' })
      )

      await authFetch('/api/ai/copilot', { method: 'POST', body: '{}' })

      expect(toastWarning).toHaveBeenCalledWith(
        expect.stringContaining('Rate limit reached')
      )
    })

    it('should include retry seconds from Retry-After header in the toast', async () => {
      mockFetch.mockResolvedValue(
        makeResponse(429, { 'Retry-After': '45' })
      )

      await authFetch('/api/ai/copilot')

      expect(toastWarning).toHaveBeenCalledWith(
        expect.stringContaining('45 seconds')
      )
    })

    it('should use "Try again later" when no Retry-After header is present', async () => {
      mockFetch.mockResolvedValue(makeResponse(429))

      await authFetch('/api/ai/copilot')

      expect(toastWarning).toHaveBeenCalledWith(
        expect.stringContaining('Try again later')
      )
    })

    it('should fall back to JSON body retryAfter when header is missing', async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ retryAfter: 20 }), {
          status: 429,
          headers: new Headers({ 'Content-Type': 'application/json' }),
        })
      )

      await authFetch('/api/ai/copilot')

      expect(toastWarning).toHaveBeenCalledWith(
        expect.stringContaining('20 seconds')
      )
    })

    it('should use singular "second" when retry is 1', async () => {
      mockFetch.mockResolvedValue(
        makeResponse(429, { 'Retry-After': '1' })
      )

      await authFetch('/api/ai/copilot')

      expect(toastWarning).toHaveBeenCalledWith(
        expect.stringMatching(/1 second[^s]/)
      )
    })

    it('should still return the 429 response to the caller', async () => {
      mockFetch.mockResolvedValue(
        makeResponse(429, { 'Retry-After': '10' })
      )

      const response = await authFetch('/api/ai/copilot')

      expect(response.status).toBe(429)
    })

    it('should not show toast for non-429 responses', async () => {
      mockFetch.mockResolvedValue(makeResponse(200))

      await authFetch('/api/test')

      expect(toastWarning).not.toHaveBeenCalled()
    })
  })

  describe('method and body passthrough', () => {
    it('should pass through POST method and body', async () => {
      const body = JSON.stringify({ query: 'test' })
      mockFetch.mockResolvedValue(makeResponse(200))

      await authFetch('/api/data', { method: 'POST', body })

      const call = mockFetch.mock.calls[0]
      expect(call[1].method).toBe('POST')
      expect(call[1].body).toBe(body)
    })
  })
})

describe('createAuthEventSource', () => {
  beforeEach(() => {
    // Stub EventSource as a class constructor
    const MockEventSource = vi.fn()
    vi.stubGlobal('EventSource', MockEventSource)
  })

  it('should return null when no token exists', () => {
    const result = createAuthEventSource('/api/notifications/stream')
    expect(result).toBeNull()
  })

  it('should create an EventSource with token query param (no existing params)', () => {
    localStorageMock._store()['oneway-auth-token'] = 'sse-token'

    createAuthEventSource('/api/notifications/stream')

    const MockEventSource = globalThis.EventSource as ReturnType<typeof vi.fn>
    expect(MockEventSource).toHaveBeenCalledWith(
      '/api/notifications/stream?token=sse-token'
    )
  })

  it('should append token with & when URL already has query params', () => {
    localStorageMock._store()['oneway-auth-token'] = 'sse-token'

    createAuthEventSource('/api/notifications/stream?limit=50')

    const MockEventSource = globalThis.EventSource as ReturnType<typeof vi.fn>
    expect(MockEventSource).toHaveBeenCalledWith(
      '/api/notifications/stream?limit=50&token=sse-token'
    )
  })
})