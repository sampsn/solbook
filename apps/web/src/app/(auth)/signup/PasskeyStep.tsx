'use client'

import { useState } from 'react'
import { startRegistration } from '@simplewebauthn/browser'

interface Props {
  accessToken: string
  onComplete: () => void
  onSkip: () => void
}

export default function PasskeyStep({ accessToken, onComplete, onSkip }: Props) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function registerPasskey() {
    setLoading(true)
    setError('')

    try {
      const optionsRes = await fetch('/api/passkey/register-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      })
      const options = await optionsRes.json()
      if (options.error) throw new Error(options.error)

      const registrationResponse = await startRegistration({ optionsJSON: options })

      const verifyRes = await fetch('/api/passkey/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, registrationResponse }),
      })
      const result = await verifyRes.json()

      if (!result.verified) {
        setError('Passkey registration failed. Please try again.')
        setLoading(false)
        return
      }

      onComplete()
    } catch {
      setError('Passkey setup failed. You can add one later in settings.')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-semibold">Set up a passkey</h2>
        <p className="text-sm text-zinc-400">
          Sign in with your fingerprint or face — no password needed. Passkeys are
          hardware-bound and can&apos;t be phished.
        </p>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        onClick={registerPasskey}
        disabled={loading}
        className="w-full bg-white text-black rounded-full py-2.5 text-sm font-semibold disabled:opacity-50 hover:bg-zinc-200 transition-colors"
      >
        {loading ? 'Setting up…' : 'Set up passkey'}
      </button>
      <button
        onClick={onSkip}
        className="w-full text-zinc-500 text-sm hover:text-zinc-300 transition-colors"
      >
        Skip for now
      </button>
    </div>
  )
}
