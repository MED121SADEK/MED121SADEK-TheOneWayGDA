import { createHash, randomBytes, timingSafeEqual } from 'crypto'

// ── Password hashing with scrypt ──
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = createHash('sha256')
    .update(password + salt)
    .digest('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const candidate = createHash('sha256')
    .update(password + salt)
    .digest('hex')
  try {
    return timingSafeEqual(Buffer.from(hash), Buffer.from(candidate))
  } catch {
    return false
  }
}

// ── Session token generation ──
export function generateToken(): string {
  return randomBytes(48).toString('hex')
}

// ── Extract token from request ──
export function getTokenFromRequest(request: Request): string | null {
  // Check Authorization header
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }

  // Check query param (for GET requests from browser)
  const url = new URL(request.url)
  const token = url.searchParams.get('token')
  if (token) return token

  return null
}
