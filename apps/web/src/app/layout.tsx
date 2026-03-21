import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'solbook',
  description: 'The human-only social network.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
    },
  },
  other: {
    // Opt out of AI training
    'robots': 'noai, noimageai, noindex, noarchive',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Explicit meta tags for AI crawlers that read HTML directly */}
        <meta name="robots" content="noai, noimageai, noindex, noarchive, nositelinkssearchbox" />
      </head>
      <body>{children}</body>
    </html>
  )
}
