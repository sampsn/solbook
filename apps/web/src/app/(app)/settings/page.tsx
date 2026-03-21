import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-6">Settings</h1>
      <p className="text-[#888880]">Account settings coming soon.</p>
    </div>
  )
}
