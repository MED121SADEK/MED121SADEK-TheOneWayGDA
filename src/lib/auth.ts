import { randomBytes, timingSafeEqual, scrypt as _scrypt } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(_scrypt)

// ── Scrypt parameters (OWASP recommended) ──
const SCRYPT_KEYLEN = 64
const SCRYPT_COST = 16384   // N (CPU/memory cost)
const SCRYPT_BLOCK = 8      // r (block size)
const SCRYPT_PARALLEL = 1    // p (parallelization)

// Prefix used to identify scrypt-hashed passwords (vs legacy SHA-256)
const SCRYPT_PREFIX = 'scrypt$'

// ── Password hashing with scrypt (OWASP-recommended) ──
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const derived = await scryptAsync(password, salt, SCRYPT_KEYLEN, {
    cost: SCRYPT_COST,
    blockSize: SCRYPT_BLOCK,
    parallelization: SCRYPT_PARALLEL,
  })
  // Format: scrypt$<hex_salt>$<hex_hash>
  return `${SCRYPT_PREFIX}${salt.toString('hex')}$${derived.toString('hex')}`
}

// ── Verify password — supports both scrypt (new) and SHA-256 (legacy) ──
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (stored.startsWith(SCRYPT_PREFIX)) {
    // New scrypt format: scrypt$<salt>$<hash>
    const parts = stored.split('$')
    if (parts.length !== 3) return false
    const salt = Buffer.from(parts[1], 'hex')
    const expected = Buffer.from(parts[2], 'hex')
    try {
      const derived = await scryptAsync(password, salt, SCRYPT_KEYLEN, {
        cost: SCRYPT_COST,
        blockSize: SCRYPT_BLOCK,
        parallelization: SCRYPT_PARALLEL,
      })
      return timingSafeEqual(expected, derived)
    } catch {
      return false
    }
  } else {
    // Legacy SHA-256 format: <salt>:<hash> — verify and log for migration
    const [salt, hash] = stored.split(':')
    if (!salt || !hash) return false
    const { createHash } = await import('crypto')
    const candidate = createHash('sha256').update(password + salt).digest('hex')
    try {
      const match = timingSafeEqual(Buffer.from(hash), Buffer.from(candidate))
      // Log legacy hash usage so admins know to migrate
      if (match) {
        console.warn('[AUTH] Legacy SHA-256 password verified — consider rehashing on next login')
      }
      return match
    } catch {
      return false
    }
  }
}

// ── Session token generation ──
export function generateToken(): string {
  return randomBytes(48).toString('hex')
}

// ── Extract token from request (Authorization header only — never from query params) ──
export function getTokenFromRequest(request: Request): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }
  // Fallback: check custom header (used by internal components)
  const xToken = request.headers.get('x-auth-token')
  if (xToken) return xToken
  return null
}

// ── Verify session token against database ──
export async function verifySession(token: string): Promise<{ userId: string; email: string; role: string; name: string | null } | null> {
  try {
    const { db } = await import('@/lib/db')
    const session = await db.userSession.findUnique({
      where: { token },
      include: { user: { select: { id: true, email: true, role: true, name: true } } },
    })
    if (!session || session.expiresAt < new Date()) {
      // Clean up expired session
      if (session) db.userSession.delete({ where: { id: session.id } }).catch(() => {})
      return null
    }
    return session.user
  } catch {
    return null
  }
}
