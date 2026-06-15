/**
 * ═══════════════════════════════════════════════════════════════════
 *  AUTH ARCHITECTURE OVERVIEW
 * ═══════════════════════════════════════════════════════════════════
 *
 *  This system uses THREE independent auth mechanisms, each with a
 *  distinct scope — do not confuse them.
 *
 *  ─────────────────────────────────────────────────────────────────
 *  1. SESSION TOKEN AUTH  (primary — used by the main application)
 *  ─────────────────────────────────────────────────────────────────
 *  Flow:  User logs in (email + password)
 *         → server calls generateToken() → stores in UserSession table
 *         → client receives token, saves as localStorage 'oneway-auth-token'
 *         → client sends token via `Authorization: Bearer <token>` header
 *         → API routes call requireAuth() → verifySession() → DB lookup
 *         → returns { userId, email, role, name } or null
 *
 *  Token lifecycle:
 *    - Created on successful login (src/app/api/login/route.ts)
 *    - 30-day expiry set at creation (expiresAt column)
 *    - Verified on every authenticated API call via verifySession()
 *    - Expired sessions are lazily deleted on failed verification
 *    - No refresh-token rotation; user re-authenticates after expiry
 *
 *  Key functions in this file:
 *    generateToken()       — creates a 48-byte random hex token
 *    getTokenFromRequest() — extracts token from Authorization or x-auth-token header
 *    verifySession()       — looks up token in DB, checks expiry, returns user
 *    hashPassword()        — scrypt hashing (OWASP-recommended)
 *    verifyPassword()      — verifies scrypt (new) or SHA-256 (legacy) hashes
 *
 *  ─────────────────────────────────────────────────────────────────
 *  2. ADMIN COOKIE AUTH  (only for /admin/* page routes)
 *  ─────────────────────────────────────────────────────────────────
 *  Flow:  Admin enters ADMIN_SECRET password on /admin/login page
 *         → server sets `oneway-admin-token` HTTP-only cookie
 *         → middleware (src/proxy.ts) checks cookie on /admin/* routes
 *         → redirects to / if cookie missing
 *
 *  ⚠  This is a SEPARATE system — it does NOT issue or verify session
 *     tokens, and it is NOT used for API authentication.
 *
 *  ─────────────────────────────────────────────────────────────────
 *  3. VISITOR EMAIL AUTH  (no login required — public registration)
 *  ─────────────────────────────────────────────────────────────────
 *  Flow:  Visitor submits email via /api/visitor (POST)
 *         → upserted into Visitor table with status 'pending'
 *         → admin reviews and sets status to 'accepted' or 'rejected'
 *         → GET /api/visitor?email=... returns the visitor's current status
 *
 *  ⚠  This is NOT a login mechanism. Visitors never get a session token.
 *     Their access is determined by their Visitor.status field, checked
 *     client-side or server-side as needed.
 * ═══════════════════════════════════════════════════════════════════
 */

import { randomBytes, timingSafeEqual, scrypt as _scrypt } from 'crypto'

// ── Scrypt parameters (OWASP recommended) ──
const SCRYPT_KEYLEN = 64
const SCRYPT_COST = 16384   // N (CPU/memory cost)
const SCRYPT_BLOCK = 8      // r (block size)
const SCRYPT_PARALLEL = 1    // p (parallelization)

// Prefix used to identify scrypt-hashed passwords (vs legacy SHA-256)
const SCRYPT_PREFIX = 'scrypt$'

/** Promisified scrypt with proper typing (avoids util.promisify type issues) */
function scryptAsync(password: string | Buffer, salt: Buffer, keylen: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    _scrypt(password, salt, keylen, { cost: SCRYPT_COST, blockSize: SCRYPT_BLOCK, parallelization: SCRYPT_PARALLEL }, (err, derivedKey) => {
      if (err) reject(err)
      else resolve(derivedKey)
    })
  })
}

// ── Password hashing with scrypt (OWASP-recommended) ──
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const derived = await scryptAsync(password, salt, SCRYPT_KEYLEN)
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
      const derived = await scryptAsync(password, salt, SCRYPT_KEYLEN)
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
    return { userId: session.user.id, email: session.user.email, role: session.user.role, name: session.user.name }
  } catch {
    return null
  }
}
