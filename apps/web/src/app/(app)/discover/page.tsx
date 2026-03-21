import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Discover' }

export default function DiscoverPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-6">Discover</h1>
      <p className="text-[#888880]">Trending posts will appear here.</p>
    </div>
  )
}
