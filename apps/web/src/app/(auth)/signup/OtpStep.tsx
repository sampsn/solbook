'use client'

import { useState } from 'react'
import { verifyPhoneOtp } from '@/actions/auth'

interface Props {
  phone: string
  onVerified: (accessToken: string, userId: string) => void
}

export default function OtpStep({ phone, onVerified }: Props) {
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await verifyPhoneOtp(phone, otp)
    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }
    onVerified(result.accessToken!, result.userId!)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-zinc-400">Enter the 6-digit code sent to {phone}.</p>
      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        value={otp}
        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
        placeholder="000000"
        required
        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 tracking-widest text-center focus:outline-none focus:border-zinc-500"
      />
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-white text-black rounded-full py-2.5 text-sm font-semibold disabled:opacity-50 hover:bg-zinc-200 transition-colors"
      >
        {loading ? 'Verifying…' : 'Verify code'}
      </button>
    </form>
  )
}
