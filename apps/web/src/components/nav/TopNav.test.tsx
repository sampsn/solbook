import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TopNav } from './TopNav'

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

  it('wraps @username in brackets when on own profile', () => {
    vi.mocked(usePathname).mockReturnValue('/gabriel')
    render(<TopNav username="gabriel" />)
    expect(screen.getByText('[@gabriel]')).toBeInTheDocument()
  })

  it('does not bracket inactive links', () => {
    vi.mocked(usePathname).mockReturnValue('/home')
    render(<TopNav username="gabriel" />)
    expect(screen.getByText('discover')).toBeInTheDocument()
    expect(screen.getByText('@gabriel')).toBeInTheDocument()
  })

  it('renders the bell icon link to /notifications', () => {
    vi.mocked(usePathname).mockReturnValue('/home')
    render(<TopNav username="gabriel" />)
    const bell = screen.getByRole('link', { name: 'alerts' })
    expect(bell).toHaveAttribute('href', '/notifications')
  })

  it('does not render alerts as a text nav item', () => {
    vi.mocked(usePathname).mockReturnValue('/home')
    render(<TopNav username="gabriel" />)
    expect(screen.queryByText('alerts')).not.toBeInTheDocument()
    expect(screen.queryByText('[alerts]')).not.toBeInTheDocument()
  })

  it('renders a search icon link to /search', () => {
    vi.mocked(usePathname).mockReturnValue('/home')
    render(<TopNav username="gabriel" />)
    const searchLink = screen.getByRole('link', { name: 'search' })
    expect(searchLink).toHaveAttribute('href', '/search')
  })

  it('does not render search as a text nav item', () => {
    vi.mocked(usePathname).mockReturnValue('/home')
    render(<TopNav username="gabriel" />)
    expect(screen.queryByText('search')).not.toBeInTheDocument()
  })
})
