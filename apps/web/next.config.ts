import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // No client-side Supabase env vars exposed.
  // All data access via server components/actions only.
}

export default nextConfig
