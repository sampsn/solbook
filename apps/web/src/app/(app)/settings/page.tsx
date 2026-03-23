import type { Metadata } from 'next'
import { createServerClient } from '@solbook/shared/supabase'
import { requireSession } from '@/lib/auth'
import { logout } from '@/actions/auth'
import { updateProfile } from '@/actions/profiles'
import { PageHeader } from '@/components/nav/PageHeader'
import { ThemeToggle } from '@/components/settings/ThemeToggle'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const session = await requireSession()
  const supabase = createServerClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, bio, theme')
    .eq('id', session.userId)
    .single()

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader title="settings" showBack />

      <div className="border-b border-[#333333] px-4 py-4">
        <h2 className="text-xs text-[#888880] uppercase tracking-wide mb-3">profile</h2>
        <form action={updateProfile} className="space-y-3">
          <div>
            <label className="text-xs text-[#888880] block mb-1">display name</label>
            <input
              name="displayName"
              type="text"
              defaultValue={profile?.display_name ?? ''}
              maxLength={50}
              required
              className="w-full bg-[#242424] border border-[#333333] px-3 py-2 text-sm text-[#e8e6d9] placeholder:text-[#555550] focus:outline-none focus:border-[#ff6600]"
            />
          </div>
          <div>
            <label className="text-xs text-[#888880] block mb-1">bio</label>
            <textarea
              name="bio"
              defaultValue={profile?.bio ?? ''}
              maxLength={160}
              rows={3}
              className="w-full bg-[#242424] border border-[#333333] px-3 py-2 text-sm text-[#e8e6d9] placeholder:text-[#555550] focus:outline-none focus:border-[#ff6600] resize-none"
            />
          </div>
          <button
            type="submit"
            className="bg-[#ff6600] text-[#1c1c1c] text-xs font-bold px-4 py-2 hover:bg-[#ff7722] transition-colors"
          >
            save changes
          </button>
        </form>
      </div>

      <div className="border-b border-[#333333] px-4 py-4">
        <h2 className="text-xs text-[#888880] uppercase tracking-wide mb-3">appearance</h2>
        <ThemeToggle initialTheme={(profile?.theme ?? 'system') as 'system' | 'dark' | 'light'} />
      </div>

      <div className="px-4 py-4">
        <h2 className="text-xs text-[#888880] uppercase tracking-wide mb-3">account</h2>
        <p className="text-xs text-[#888880] mb-3">@{profile?.username}</p>
        <form action={logout}>
          <button
            type="submit"
            className="border border-[#333333] text-[#888880] text-xs px-4 py-2 hover:border-red-400 hover:text-red-400 transition-colors"
          >
            sign out
          </button>
        </form>
      </div>
    </div>
  )
}
