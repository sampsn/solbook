import { NextRequest, NextResponse } from 'next/server'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { createServerClient } from '@solbook/shared/supabase'
import { Redis } from '@upstash/redis'

const RP_ID = process.env.NEXT_PUBLIC_RP_ID ?? 'localhost'
const ORIGIN = process.env.NEXT_PUBLIC_ORIGIN ?? 'http://localhost:3000'

export async function POST(req: NextRequest) {
  const { accessToken, registrationResponse } = await req.json()
  const supabase = createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser(accessToken)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const redis = Redis.fromEnv()
  const challenge = await redis.getdel(`passkey_challenge:${user.id}`)
  if (!challenge) {
    return NextResponse.json({ error: 'Challenge expired or not found.' }, { status: 400 })
  }

  const verification = await verifyRegistrationResponse({
    response: registrationResponse,
    expectedChallenge: challenge as string,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: true,
  })

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: 'Passkey verification failed.' }, { status: 400 })
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo

  await supabase.from('passkey_credentials').insert({
    user_id: user.id,
    credential_id: Buffer.from(credential.id).toString('base64url'),
    public_key: Buffer.from(credential.publicKey).toString('base64url'),
    counter: credential.counter,
    device_type: credentialDeviceType,
    backed_up: credentialBackedUp,
  })

  return NextResponse.json({ verified: true })
}
