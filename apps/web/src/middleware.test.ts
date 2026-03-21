import { describe, it, expect } from 'vitest'
import { middleware } from './middleware'
import { NextRequest } from 'next/server'

function makeRequest(pathname: string, ua?: string): NextRequest {
  const url = `http://localhost${pathname}`
  return new NextRequest(url, {
    headers: ua ? { 'user-agent': ua } : {},
  })
}

describe('middleware', () => {
  describe('bot blocking', () => {
    it('blocks GPTBot', () => {
      const res = middleware(makeRequest('/', 'Mozilla/5.0 (compatible; GPTBot/1.0)'))
      expect(res.status).toBe(403)
    })

    it('blocks CCBot', () => {
      const res = middleware(makeRequest('/', 'CCBot/2.0 (https://commoncrawl.org/faq/)'))
      expect(res.status).toBe(403)
    })

    it('blocks anthropic-ai', () => {
      const res = middleware(makeRequest('/', 'anthropic-ai/1.0'))
      expect(res.status).toBe(403)
    })

    it('blocks python-requests', () => {
      const res = middleware(makeRequest('/', 'python-requests/2.31.0'))
      expect(res.status).toBe(403)
    })

    it('blocks scrapy', () => {
      const res = middleware(makeRequest('/', 'Scrapy/2.11.0 (+https://scrapy.org)'))
      expect(res.status).toBe(403)
    })

    it('allows normal browser', () => {
      const res = middleware(
        makeRequest(
          '/',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ),
      )
      expect(res.status).toBe(200)
    })

    it('allows Safari mobile', () => {
      const res = middleware(
        makeRequest(
          '/',
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        ),
      )
      expect(res.status).toBe(200)
    })
  })

  describe('honeypot paths', () => {
    it('returns 200 for honeypot /api/users', () => {
      const res = middleware(makeRequest('/api/users', 'curl/8.0'))
      expect(res.status).toBe(200)
    })

    it('returns 200 for honeypot /.env', () => {
      const res = middleware(makeRequest('/.env'))
      expect(res.status).toBe(200)
    })
  })

  describe('anti-AI headers', () => {
    it('sets X-Robots-Tag on normal responses', () => {
      const res = middleware(
        makeRequest(
          '/home',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        ),
      )
      expect(res.headers.get('X-Robots-Tag')).toContain('noai')
      expect(res.headers.get('X-Robots-Tag')).toContain('noimageai')
    })
  })
})
