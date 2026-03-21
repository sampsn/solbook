import { createHmac } from 'crypto'

// HMAC-signed session tokens. No Supabase JWT required for authenticated requests
// because all DB queries use the service role client (bypasses RLS).
// The token proves "this user_id was verified by the server" without storing
// session state — the HMAC signature prevents tampering.

interface SessionPayload {
  userId: string
  iat: number
  exp: number
}

function getSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('Missing AUTH_SECRET environment variable.')
  return secret
}

export function createSessionToken(userId: string): string {
  const payload: SessionPayload = {
    userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
  }
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = createHmac('sha256', getSecret()).update(data).digest('base64url')
  return `${data}.${sig}`
}

export function verifySessionToken(token: string): SessionPayload | null {
  const dotIdx = token.lastIndexOf('.')
  if (dotIdx === -1) return null
  const data = token.slice(0, dotIdx)
  const sig = token.slice(dotIdx + 1)
  const expected = createHmac('sha256', getSecret()).update(data).digest('base64url')
  if (expected !== sig) return null
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString()) as SessionPayload
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}
