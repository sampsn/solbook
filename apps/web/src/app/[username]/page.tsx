import type { Metadata } from 'next'

interface Props {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  return { title: `@${username}` }
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params
  return (
    <div className="max-w-xl mx-auto px-4 py-6">
      <h1 className="text-xl font-bold mb-2">@{username}</h1>
      <p className="text-[#888880]">Profile coming soon.</p>
    </div>
  )
}
