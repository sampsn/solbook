import { redirect } from 'next/navigation'
import { createServerClient } from '@solbook/shared/supabase'
import { getSession } from '@/lib/auth'
import { TopNav } from '@/components/nav/TopNav'
import { BottomNav } from '@/components/nav/BottomNav'
import { AlertsProvider } from '@/components/nav/AlertsContext'
import { ThemeProvider } from '@/components/ThemeProvider'

async function getSessionProfile() {
  const session = await getSession()
  if (!session) return null

  const supabase = createServerClient()
  const { data } = await supabase
    .from('profiles')
    .select('username, alerts_last_seen_at, theme')
    .eq('id', session.userId)
    .single()

  if (!data) return null

  const since = data.alerts_last_seen_at

  // Check for any likes on user's posts or new followers since last seen
  const since7days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const sinceDate = since && since > since7days ? since : since7days

  const [{ data: recentLike }, { data: recentFollow }] = await Promise.all([
    supabase
      .from('likes')
      .select('id, posts!likes_post_id_fkey!inner(user_id)')
      .eq('posts.user_id', session.userId)
      .neq('user_id', session.userId)
      .gte('created_at', sinceDate)
      .limit(1),
    supabase
      .from('follows')
      .select('created_at')
      .eq('following_id', session.userId)
      .gte('created_at', sinceDate)
      .limit(1),
  ])

  return {
    username: data.username,
    hasUnseenAlerts: (recentLike ?? []).length > 0 || (recentFollow ?? []).length > 0,
    theme: (data.theme ?? 'system') as 'system' | 'dark' | 'light',
  }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile()
  if (!profile) redirect('/login')

  return (
    <ThemeProvider initialTheme={profile.theme}>
      <AlertsProvider hasUnseenAlerts={profile.hasUnseenAlerts}>
        <div className="flex flex-col min-h-screen">
          <TopNav username={profile.username} />
          <main className="flex-1 min-w-0 pb-16 md:pb-0">{children}</main>
          <BottomNav username={profile.username} />
        </div>
      </AlertsProvider>
    </ThemeProvider>
  )
}
