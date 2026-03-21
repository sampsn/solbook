import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { Sidebar } from '@/components/nav/Sidebar'
import { BottomNav } from '@/components/nav/BottomNav'

// Reads the session cookie set by the auth server action.
// Returns the username from the cookie payload, or null if unauthenticated.
// Full JWT validation is implemented in feature/auth.
async function getSessionUsername(): Promise<string | null> {
  const cookieStore = await cookies()
  const session = cookieStore.get('sb-session')
  if (!session) return null
  // Placeholder: real implementation validates JWT via supabase.auth.admin.getUser()
  return 'me'
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const username = await getSessionUsername()
  if (!username) redirect('/login')

  return (
    <div className="flex min-h-screen">
      <Sidebar username={username} />

      <main className="flex-1 min-w-0 pb-16 md:pb-0">{children}</main>

      <BottomNav />
    </div>
  )
}
