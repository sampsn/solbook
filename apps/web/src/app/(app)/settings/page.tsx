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
    <div className="max-w-2xl mx-auto">
      <PageHeader title="settings" showBack />

      <div className="border-b border-[var(--color-border)] px-4 py-4">
        <h2 className="text-xs text-[var(--color-accent-alt)] uppercase tracking-wide mb-3">profile</h2>
        <form action={updateProfile} className="space-y-3">
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--color-text-strong)' }}>display name</label>
            <input
              name="displayName"
              type="text"
              defaultValue={profile?.display_name ?? ''}
              maxLength={50}
              required
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--color-text-strong)' }}>bio</label>
            <textarea
              name="bio"
              defaultValue={profile?.bio ?? ''}
              maxLength={160}
              rows={3}
              className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)] resize-none"
            />
          </div>
          <button
            type="submit"
            className="bg-[var(--color-accent)] text-[var(--color-bg)] text-xs font-bold px-4 py-2 hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            save changes
          </button>
        </form>
      </div>

      <div className="border-b border-[var(--color-border)] px-4 py-4">
        <h2 className="text-xs text-[var(--color-accent-alt)] uppercase tracking-wide mb-3">appearance</h2>
        <ThemeToggle initialTheme={(profile?.theme ?? 'system') as 'system' | 'dark' | 'light'} />
      </div>

      <div className="px-4 py-4">
        <h2 className="text-xs text-[var(--color-accent-alt)] uppercase tracking-wide mb-3">account</h2>
        <p className="text-xs text-[var(--color-accent-alt)] mb-3">@{profile?.username}</p>
        <form action={logout}>
          <button
            type="submit"
            className="border border-[var(--color-border)] text-[var(--color-muted)] text-xs px-4 py-2 hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] transition-colors"
          >
            sign out
          </button>
        </form>
      </div>
    </div>
  )
}
