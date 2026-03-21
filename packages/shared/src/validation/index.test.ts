import { describe, it, expect } from 'vitest'
import { validatePost, validateUsername, validateDisplayName, RESERVED_USERNAMES } from './index'

describe('validatePost', () => {
  it('accepts valid content', () => {
    expect(validatePost('Hello world').valid).toBe(true)
  })

  it('rejects empty content', () => {
    const result = validatePost('')
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/empty/i)
  })

  it('rejects content over 280 chars', () => {
    const result = validatePost('a'.repeat(281))
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/280/i)
  })

  it('accepts content of exactly 280 chars', () => {
    expect(validatePost('a'.repeat(280)).valid).toBe(true)
  })
})

describe('validateUsername', () => {
  it('accepts valid username', () => {
    expect(validateUsername('gabriel_99').valid).toBe(true)
  })

  it('rejects username shorter than 3 chars', () => {
    const result = validateUsername('ab')
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/3/i)
  })

  it('rejects username longer than 20 chars', () => {
    const result = validateUsername('a'.repeat(21))
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/20/i)
  })

  it('rejects username with invalid characters', () => {
    const result = validateUsername('bad-name!')
    expect(result.valid).toBe(false)
    expect(result.error).toMatch(/letters/i)
  })

  it('rejects reserved usernames', () => {
    for (const reserved of RESERVED_USERNAMES) {
      const result = validateUsername(reserved)
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/reserved/i)
    }
  })
})

describe('validateDisplayName', () => {
  it('accepts valid display name', () => {
    expect(validateDisplayName('Gabriel Sampson').valid).toBe(true)
  })

  it('rejects empty display name', () => {
    expect(validateDisplayName('').valid).toBe(false)
  })

  it('rejects display name over 50 chars', () => {
    expect(validateDisplayName('a'.repeat(51)).valid).toBe(false)
  })
})
