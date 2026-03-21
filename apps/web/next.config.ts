import path from 'path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // No client-side Supabase env vars exposed.
  // All data access via server components/actions only.

  // Point to monorepo root so Next.js traces files correctly in the worktree.
  outputFileTracingRoot: path.join(__dirname, '../../'),
}

export default nextConfig
