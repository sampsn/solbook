import { NextResponse } from 'next/server'
import { generateAuthenticationOptions } from '@simplewebauthn/server'
import { Redis } from '@upstash/redis'

const RP_ID = process.env.NEXT_PUBLIC_RP_ID ?? 'localhost'
// Anonymous challenge key — user identity is unknown before authentication
const ANON_CHALLENGE_KEY = 'passkey_login_challenge'

export async function POST() {
  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: 'required',
  })

  const redis = Redis.fromEnv()
  // Store with a unique key per challenge (timestamp-based to allow concurrent logins)
  const key = `${ANON_CHALLENGE_KEY}:${options.challenge.slice(0, 16)}`
  await redis.set(key, options.challenge, { ex: 300 })

  return NextResponse.json({ ...options, challengeKey: key })
}
