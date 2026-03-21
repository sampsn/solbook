import { NextRequest, NextResponse } from 'next/server'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { createServerClient } from '@solbook/shared/supabase'
import { Redis } from '@upstash/redis'

const RP_NAME = 'solbook'
const RP_ID = process.env.NEXT_PUBLIC_RP_ID ?? 'localhost'

export async function POST(req: NextRequest) {
  const { accessToken } = await req.json()
  const supabase = createServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser(accessToken)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existing } = await supabase
    .from('passkey_credentials')
    .select('credential_id')
    .eq('user_id', user.id)

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: user.phone ?? user.id,
    userDisplayName: user.phone ?? 'solbook user',
    excludeCredentials: (existing ?? []).map((c) => ({ id: c.credential_id })),
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'required',
    },
  })

  const redis = Redis.fromEnv()
  await redis.set(`passkey_challenge:${user.id}`, options.challenge, { ex: 300 })

  return NextResponse.json(options)
}
