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

  it('does not render compose or settings links', () => {
    vi.mocked(usePathname).mockReturnValue('/home')
    render(<BottomNav username="gabriel" />)
    expect(screen.queryByText('new')).not.toBeInTheDocument()
    expect(screen.queryByText('settings')).not.toBeInTheDocument()
  })

  it('brackets the active home link', () => {
    vi.mocked(usePathname).mockReturnValue('/home')
    render(<BottomNav username="gabriel" />)
    expect(screen.getByText('[home]')).toBeInTheDocument()
  })

  it('brackets alerts when on /notifications', () => {
    vi.mocked(usePathname).mockReturnValue('/notifications')
    render(<BottomNav username="gabriel" />)
    expect(screen.getByText('[alerts]')).toBeInTheDocument()
  })

  it('brackets @username when on own profile', () => {
    vi.mocked(usePathname).mockReturnValue('/gabriel')
    render(<BottomNav username="gabriel" />)
    expect(screen.getByText('[@gabriel]')).toBeInTheDocument()
  })
})
