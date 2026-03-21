import { NextRequest, NextResponse } from 'next/server'

// Known AI crawler and bot user-agent substrings (case-insensitive match)
const BLOCKED_UA_PATTERNS = [
  'gptbot',
  'chatgpt-user',
  'google-extended',
  'ccbot',
  'anthropic-ai',
  'claude-web',
  'cohere-ai',
  'perplexitybot',
  'youbot',
  'bytespider',
  'applebot-extended',
  'diffbot',
  'facebookbot',
  'imagesiftbot',
  'omgilibot',
  'timpibot',
  'dataforseobot',
  'petalbot',
  // Generic scrapers
  'scrapy',
  'python-requests',
  'go-http-client',
  'java/',
  'libwww-perl',
  'curl/',
  'wget/',
] as const

// Honeypot paths — any request to these returns 200 but logs the hit
// (Upstash-backed IP blacklisting deferred to feature/anti-ai-redis)
const HONEYPOT_PATHS = ['/api/users', '/api/posts', '/sitemap-full.xml', '/.env', '/admin']

export function middleware(request: NextRequest) {
  const ua = request.headers.get('user-agent')?.toLowerCase() ?? ''
  const { pathname } = request.nextUrl

  // Honeypot: return 200 with empty body (real users never hit these)
  if (HONEYPOT_PATHS.some((p) => pathname.startsWith(p))) {
    return new NextResponse(null, { status: 200 })
  }

  // Block known AI/bot user agents
  if (BLOCKED_UA_PATTERNS.some((pattern) => ua.includes(pattern))) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const response = NextResponse.next()

  // Anti-AI headers on every response
  response.headers.set('X-Robots-Tag', 'noai, noimageai, noindex, noarchive, nositelinkssearchbox')

  return response
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, robots.txt, ai.txt (served from public/)
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|ai.txt).*)',
  ],
}
