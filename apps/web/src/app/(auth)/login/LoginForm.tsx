'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { startAuthentication } from '@simplewebauthn/browser'

export default function LoginForm() {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function loginWithPasskey() {
    setLoading(true)
    setError('')

    try {
      const optionsRes = await fetch('/api/passkey/login-options', { method: 'POST' })
      const { challengeKey, ...options } = await optionsRes.json()
      if (options.error) throw new Error(options.error)

      const authenticationResponse = await startAuthentication({ optionsJSON: options })

      const verifyRes = await fetch('/api/passkey/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authenticationResponse, challengeKey }),
      })
      const result = await verifyRes.json()

      if (!result.verified) {
        setError(result.error ?? 'Authentication failed.')
        setLoading(false)
        return
      }

      router.push('/home')
    } catch {
      setError('Passkey authentication failed. Make sure you have a passkey set up.')
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      <button
        onClick={loginWithPasskey}
        disabled={loading}
        className="w-full bg-white text-black rounded-full py-2.5 text-sm font-semibold disabled:opacity-50 hover:bg-zinc-200 transition-colors"
      >
        {loading ? 'Authenticating…' : 'Sign in with passkey'}
      </button>
    </div>
  )
}
