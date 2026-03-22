import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BottomNav } from './BottomNav'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}))

import { usePathname } from 'next/navigation'

describe('BottomNav', () => {
  it('renders @username link', () => {
    vi.mocked(usePathname).mockReturnValue('/home')
    render(<BottomNav username="gabriel" />)
    expect(screen.getByText('@gabriel')).toBeInTheDocument()
  })

  it('does not render alerts link', () => {
    vi.mocked(usePathname).mockReturnValue('/home')
    render(<BottomNav username="gabriel" />)
    expect(screen.queryByText('alerts')).not.toBeInTheDocument()
  })

  it('renders exactly 3 nav items', () => {
    vi.mocked(usePathname).mockReturnValue('/home')
    render(<BottomNav username="gabriel" />)
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(3)
  })

  it('brackets the active home link', () => {
    vi.mocked(usePathname).mockReturnValue('/home')
    render(<BottomNav username="gabriel" />)
    expect(screen.getByText('[home]')).toBeInTheDocument()
  })

  it('brackets @username when on own profile', () => {
    vi.mocked(usePathname).mockReturnValue('/gabriel')
    render(<BottomNav username="gabriel" />)
    expect(screen.getByText('[@gabriel]')).toBeInTheDocument()
  })
})
