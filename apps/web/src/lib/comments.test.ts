import { describe, it, expect } from 'vitest'
import { hnScore, buildCommentTree } from './comments'
import type { Comment } from '@solbook/shared/types'

// Helper to create a minimal Comment fixture
function comment(overrides: Partial<Comment> & { id: string }): Comment {
  return {
    post_id: 'p1',
    user_id: 'u1',
    parent_id: null,
    content: 'test',
    depth: 0,
    created_at: new Date().toISOString(),
    profile: { id: 'u1', username: 'alice', display_name: 'Alice', bio: null, avatar_url: null, created_at: new Date().toISOString() },
    like_count: 0,
    liked_by_me: false,
    ...overrides,
  }
}

describe('hnScore', () => {
  it('returns a number for zero likes at age 0', () => {
    const score = hnScore(0, new Date().toISOString())
    expect(typeof score).toBe('number')
    expect(score).toBeGreaterThanOrEqual(0)
  })

  it('higher likes = higher score at same age', () => {
    const now = new Date().toISOString()
    expect(hnScore(10, now)).toBeGreaterThan(hnScore(1, now))
  })

  it('older comments score lower than newer ones with same likes', () => {
    const old = new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString() // 10h ago
    const recent = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() // 1h ago
    expect(hnScore(5, recent)).toBeGreaterThan(hnScore(5, old))
  })
})

describe('buildCommentTree', () => {
  it('returns empty array for empty input', () => {
    expect(buildCommentTree([], null)).toEqual([])
  })

  it('returns top-level comments with no children', () => {
    const c = comment({ id: 'c1' })
    const result = buildCommentTree([c], null)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('c1')
    expect(result[0].children).toEqual([])
  })

  it('nests a child under its parent', () => {
    const parent = comment({ id: 'c1', depth: 0 })
    const child = comment({ id: 'c2', parent_id: 'c1', depth: 1 })
    const result = buildCommentTree([parent, child], null)
    expect(result).toHaveLength(1)
    expect(result[0].children).toHaveLength(1)
    expect(result[0].children[0].id).toBe('c2')
  })

  it('sorts siblings by HN score descending', () => {
    const now = new Date().toISOString()
    const low = comment({ id: 'c-low', like_count: 1, created_at: now })
    const high = comment({ id: 'c-high', like_count: 10, created_at: now })
    const result = buildCommentTree([low, high], null)
    expect(result[0].id).toBe('c-high')
    expect(result[1].id).toBe('c-low')
  })

  it('sets liked_by_me based on userId', () => {
    const c = comment({ id: 'c1' })
    // liked_by_me is computed by the query layer; buildCommentTree preserves it
    const resultWithUser = buildCommentTree([{ ...c, liked_by_me: true }], 'u1')
    expect(resultWithUser[0].liked_by_me).toBe(true)
  })
})
