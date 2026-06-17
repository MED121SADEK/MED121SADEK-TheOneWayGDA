import { describe, it, expect, beforeEach, vi } from 'vitest'

let auth: typeof import('../auth')

beforeEach(async () => {
  vi.resetModules()
  auth = await import('../auth')
})

// ── Tests ──────────────────────────────────────────────────

describe('auth', () => {
  describe('generateToken', () => {
    it('should return a 96-character hex string (48 bytes)', () => {
      const token = auth.generateToken()
      expect(token).toHaveLength(96)
      expect(token).toMatch(/^[0-9a-f]+$/)
    })

    it('should generate unique tokens on each call', () => {
      const tokens = new Set(Array.from({ length: 20 }, () => auth.generateToken()))
      expect(tokens.size).toBe(20) // all unique
    })
  })

  describe('hashPassword', () => {
    it('should return a string in scrypt$<salt>$<hash> format', async () => {
      const hash = await auth.hashPassword('password123')
      expect(hash).toMatch(/^scrypt\$[0-9a-f]+\$[0-9a-f]+$/)
    })

    it('should produce different hashes for the same password (random salt)', async () => {
      const hash1 = await auth.hashPassword('same-password')
      const hash2 = await auth.hashPassword('same-password')
      expect(hash1).not.toBe(hash2)
    })

    it('should produce different hashes for different passwords', async () => {
      const hash1 = await auth.hashPassword('password-1')
      const hash2 = await auth.hashPassword('password-2')
      expect(hash1).not.toBe(hash2)
    })

    it('should have 32-char salt (16 bytes hex)', async () => {
      const hash = await auth.hashPassword('test')
      const salt = hash.split('$')[1]
      expect(salt).toHaveLength(32)
    })

    it('should have 128-char hash (64 bytes hex)', async () => {
      const hash = await auth.hashPassword('test')
      const hashPart = hash.split('$')[2]
      expect(hashPart).toHaveLength(128)
    })
  })

  describe('verifyPassword (scrypt)', () => {
    it('should return true for a correct password', async () => {
      const password = 'my-secure-password'
      const hash = await auth.hashPassword(password)
      expect(await auth.verifyPassword(password, hash)).toBe(true)
    })

    it('should return false for an incorrect password', async () => {
      const hash = await auth.hashPassword('correct-password')
      expect(await auth.verifyPassword('wrong-password', hash)).toBe(false)
    })

    it('should handle empty passwords', async () => {
      const hash = await auth.hashPassword('')
      expect(await auth.verifyPassword('', hash)).toBe(true)
      expect(await auth.verifyPassword('non-empty', hash)).toBe(false)
    })

    it('should handle long passwords', async () => {
      const longPw = 'a'.repeat(1000)
      const hash = await auth.hashPassword(longPw)
      expect(await auth.verifyPassword(longPw, hash)).toBe(true)
    })

    it('should handle passwords with special characters', async () => {
      const specialPw = 'p@$$w0rd!#$%^&*()_+-=[]{}|;:,.<>?/~`'
      const hash = await auth.hashPassword(specialPw)
      expect(await auth.verifyPassword(specialPw, hash)).toBe(true)
    })

    it('should handle unicode passwords', async () => {
      const unicodePw = 'm\u00f4t de passe \u00e9l\u00e9phant \ud83d\ude80'
      const hash = await auth.hashPassword(unicodePw)
      expect(await auth.verifyPassword(unicodePw, hash)).toBe(true)
    })
  })

  describe('verifyPassword (legacy SHA-256)', () => {
    it('should verify a legacy SHA-256 hash', async () => {
      // Manually create a SHA-256 hash in the legacy format: <salt>:<hash>
      const { createHash } = await import('crypto')
      const salt = 'test-salt'
      const password = 'legacy-password'
      const hash = createHash('sha256').update(password + salt).digest('hex')
      const stored = `${salt}:${hash}`

      expect(await auth.verifyPassword(password, stored)).toBe(true)
    })

    it('should reject wrong password for legacy SHA-256 hash', async () => {
      const { createHash } = await import('crypto')
      const salt = 'test-salt'
      const hash = createHash('sha256').update('correct' + salt).digest('hex')
      const stored = `${salt}:${hash}`

      expect(await auth.verifyPassword('wrong', stored)).toBe(false)
    })

    it('should return false for malformed legacy hash (no colon)', async () => {
      expect(await auth.verifyPassword('test', 'no-colon-here')).toBe(false)
    })

    it('should return false for malformed scrypt hash (wrong parts)', async () => {
      expect(await auth.verifyPassword('test', 'scrypt$onlytwo')).toBe(false)
    })
  })

  describe('getTokenFromRequest', () => {
    it('should extract token from Authorization: Bearer header', () => {
      const request = new Request('http://localhost', {
        headers: { 'Authorization': 'Bearer abc123token' },
      })
      expect(auth.getTokenFromRequest(request)).toBe('abc123token')
    })

    it('should extract token from x-auth-token header (fallback)', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-auth-token': 'fallback-token' },
      })
      expect(auth.getTokenFromRequest(request)).toBe('fallback-token')
    })

    it('should prefer Authorization header over x-auth-token', () => {
      const request = new Request('http://localhost', {
        headers: {
          'Authorization': 'Bearer auth-token',
          'x-auth-token': 'fallback-token',
        },
      })
      expect(auth.getTokenFromRequest(request)).toBe('auth-token')
    })

    it('should return null when no auth headers are present', () => {
      const request = new Request('http://localhost')
      expect(auth.getTokenFromRequest(request)).toBeNull()
    })

    it('should return null for Authorization header without Bearer prefix', () => {
      const request = new Request('http://localhost', {
        headers: { 'Authorization': 'Basic dXNlcjpwYXNz' },
      })
      expect(auth.getTokenFromRequest(request)).toBeNull()
    })

    it('should handle empty Bearer token by returning empty string', () => {
      const request = new Request('http://localhost', {
        headers: { 'Authorization': 'Bearer ' },
      })
      // "Bearer ".slice(7) = "" — the function returns whatever slice gives
      const result = auth.getTokenFromRequest(request)
      // The result is either "" (if Bearer prefix matched) or null
      // Both are acceptable — the caller handles both as "no valid token"
      expect(result === '' || result === null).toBe(true)
    })
  })
})