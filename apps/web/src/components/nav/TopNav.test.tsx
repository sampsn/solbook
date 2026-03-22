import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TopNav } from './TopNav'

// Mock usePathname
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}))

import { usePathname } from 'next/navigation'

describe('TopNav', () => {
  it('renders the solbook logo', () => {
    vi.mocked(usePathname).mockReturnValue('/home')
    render(<TopNav username="gabriel" />)
    expect(screen.getByText('solbook')).toBeInTheDocument()
  })

  it('wraps the active route label in brackets', () => {
    vi.mocked(usePathname).mockReturnValue('/home')
    render(<TopNav username="gabriel" />)
    expect(screen.getByText('[home]')).toBeInTheDocument()
  })

  it('wraps alerts in brackets when on /notifications', () => {
    vi.mocked(usePathname).mockReturnValue('/notifications')
    render(<TopNav username="gabriel" />)
    expect(screen.getByText('[alerts]')).toBeInTheDocument()
  })

  it('wraps @username in brackets when on own profile', () => {
    vi.mocked(usePathname).mockReturnValue('/gabriel')
    render(<TopNav username="gabriel" />)
    expect(screen.getByText('[@gabriel]')).toBeInTheDocument()
  })

  it('does not bracket inactive links', () => {
    vi.mocked(usePathname).mockReturnValue('/home')
    render(<TopNav username="gabriel" />)
    expect(screen.getByText('discover')).toBeInTheDocument()
    expect(screen.getByText('alerts')).toBeInTheDocument()
  })

  it('links @username to the profile route', () => {
    vi.mocked(usePathname).mockReturnValue('/home')
    render(<TopNav username="gabriel" />)
    const link = screen.getByText('@gabriel').closest('a')
    expect(link).toHaveAttribute('href', '/gabriel')
  })
})
