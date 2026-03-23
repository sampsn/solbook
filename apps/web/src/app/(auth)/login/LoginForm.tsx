'use client'

import { useState } from 'react'
import { signIn } from '@/actions/auth'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await signIn(email, password)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
    // signIn redirects to /home on success
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-300">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
          className="w-full bg-[#242424] border border-[#333333] px-3 py-2 text-sm text-[#e8e6d9] placeholder:text-[#555550] focus:outline-none focus:border-[#ff6600]"
          style={{ fontSize: '16px' }}
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-300">Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="••••••••"
          className="w-full bg-[#242424] border border-[#333333] px-3 py-2 text-sm text-[#e8e6d9] placeholder:text-[#555550] focus:outline-none focus:border-[#ff6600]"
          style={{ fontSize: '16px' }}
        />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#ff6600] text-[#1c1c1c] py-2 text-sm font-bold disabled:opacity-40 hover:bg-[#ff7722] transition-colors"
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
