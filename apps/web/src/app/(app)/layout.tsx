import { redirect } from 'next/navigation'
import { createServerClient } from '@solbook/shared/supabase'
import { getSession } from '@/lib/auth'
import { Sidebar } from '@/components/nav/Sidebar'
import { BottomNav } from '@/components/nav/BottomNav'

async function getSessionProfile(): Promise<{ username: string } | null> {
  const session = await getSession()
  if (!session) return null

  const supabase = createServerClient()
  const { data } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', session.userId)
    .single()

  return data ? { username: data.username } : null
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile()
  if (!profile) redirect('/login')

  return (
    <div className="flex min-h-screen">
      <Sidebar username={profile.username} />
      <main className="flex-1 min-w-0 pb-16 md:pb-0">{children}</main>
      <BottomNav />
    </div>
  )
}
