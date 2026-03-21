'use client'

import { useState } from 'react'
import { createProfile } from '@/actions/profiles'

interface Props {
  userId: string
}

export default function ProfileStep({ userId }: Props) {
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await createProfile(userId, username, displayName)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
    // On success, createProfile redirects to /home
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="font-semibold">Create your profile</h2>
      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-300">Display name</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={50}
          required
          placeholder="Your name"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500"
        />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-zinc-300">Username</label>
        <div className="flex items-center bg-zinc-900 border border-zinc-700 rounded-lg overflow-hidden focus-within:border-zinc-500">
          <span className="px-3 py-2 text-sm text-zinc-500">@</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            maxLength={20}
            pattern="[a-zA-Z0-9_]{3,20}"
            required
            placeholder="username"
            className="flex-1 bg-transparent px-0 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none"
          />
        </div>
        <p className="text-xs text-zinc-600">3–20 characters, letters, numbers, underscores</p>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-white text-black rounded-full py-2.5 text-sm font-semibold disabled:opacity-50 hover:bg-zinc-200 transition-colors"
      >
        {loading ? 'Creating…' : 'Create profile'}
      </button>
    </form>
  )
}
