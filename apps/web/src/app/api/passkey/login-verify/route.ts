import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import { createServerClient } from '@solbook/shared/supabase'
import { Redis } from '@upstash/redis'
import { cookies } from 'next/headers'
import { createSessionToken } from '@/lib/session'

const RP_ID = process.env.NEXT_PUBLIC_RP_ID ?? 'localhost'
const ORIGIN = process.env.NEXT_PUBLIC_ORIGIN ?? 'http://localhost:3000'

export async function POST(req: NextRequest) {
  const { authenticationResponse, challengeKey } = await req.json()
  const supabase = createServerClient()

  const redis = Redis.fromEnv()
  const challenge = await redis.getdel(challengeKey)
  if (!challenge) {
    return NextResponse.json({ error: 'Challenge expired or not found.' }, { status: 400 })
  }

  const credentialId = authenticationResponse.id
  const { data: credential } = await supabase
    .from('passkey_credentials')
    .select('*')
    .eq('credential_id', credentialId)
    .single()

  if (!credential) {
    return NextResponse.json({ error: 'Passkey not recognized.' }, { status: 401 })
  }

  const verification = await verifyAuthenticationResponse({
    response: authenticationResponse,
    expectedChallenge: challenge as string,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: true,
    credential: {
      id: credential.credential_id,
      publicKey: Buffer.from(credential.public_key, 'base64url'),
      counter: credential.counter,
    },
  })

  if (!verification.verified) {
    return NextResponse.json({ error: 'Passkey authentication failed.' }, { status: 401 })
  }

  // Update counter to prevent replay attacks
  await supabase
    .from('passkey_credentials')
    .update({ counter: verification.authenticationInfo.newCounter })
    .eq('credential_id', credentialId)

  // Issue our HMAC-signed session token (no Supabase JWT needed —
  // all DB queries use the service role client which bypasses RLS)
  const sessionToken = createSessionToken(credential.user_id)
  const cookieStore = await cookies()
  cookieStore.set('sb-auth-token', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })

  return NextResponse.json({ verified: true })
}
