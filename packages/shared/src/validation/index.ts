export const RESERVED_USERNAMES = [
  'home', 'discover', 'compose', 'notifications',
  'settings', 'login', 'signup', 'api', 'admin', 'post', 'search',
] as const

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/

interface ValidationResult {
  valid: boolean
  error?: string
}

export function validatePost(content: string): ValidationResult {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: 'Post cannot be empty.' }
  }
  if (content.length > 280) {
    return { valid: false, error: 'Post must be 280 characters or fewer.' }
  }
  return { valid: true }
}

export function validateUsername(username: string): ValidationResult {
  if (username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters.' }
  }
  if (username.length > 20) {
    return { valid: false, error: 'Username must be 20 characters or fewer.' }
  }
  if (!USERNAME_REGEX.test(username)) {
    return { valid: false, error: 'Username may only contain letters, numbers, and underscores.' }
  }
  if ((RESERVED_USERNAMES as readonly string[]).includes(username.toLowerCase())) {
    return { valid: false, error: 'That username is reserved.' }
  }
  return { valid: true }
}

export function validateDisplayName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Display name cannot be empty.' }
  }
  if (name.length > 50) {
    return { valid: false, error: 'Display name must be 50 characters or fewer.' }
  }
  return { valid: true }
}

export function validateComment(content: string): ValidationResult {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: 'Comment cannot be empty.' }
  }
  if (content.length > 1000) {
    return { valid: false, error: 'Comment must be 1000 characters or fewer.' }
  }
  return { valid: true }
}
