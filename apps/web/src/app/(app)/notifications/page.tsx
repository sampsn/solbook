import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Notifications' }

export default function NotificationsPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-6">Notifications</h1>
      <p className="text-zinc-500">Notifications will appear here.</p>
    </div>
  )
}
