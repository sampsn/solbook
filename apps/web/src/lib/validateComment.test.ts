import { describe, it, expect } from 'vitest'
import { validateComment } from '@solbook/shared/validation'

describe('validateComment', () => {
  it('rejects empty string', () => {
    expect(validateComment('').valid).toBe(false)
  })

  it('rejects whitespace-only string', () => {
    expect(validateComment('   ').valid).toBe(false)
  })

  it('accepts a valid comment', () => {
    expect(validateComment('hello world').valid).toBe(true)
  })

  it('rejects content over 1000 chars', () => {
    expect(validateComment('a'.repeat(1001)).valid).toBe(false)
  })

  it('accepts exactly 1000 chars', () => {
    expect(validateComment('a'.repeat(1000)).valid).toBe(true)
  })
})
