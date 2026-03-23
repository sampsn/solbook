import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'solbook', template: '%s · solbook' },
  description: 'The human-only social network. No bots. No AI.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
  other: {
    robots: 'noai, noimageai, noindex, noarchive',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="robots" content="noai, noimageai, noindex, noarchive, nositelinkssearchbox" />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var h=localStorage.getItem('solbook-theme-hint');if(h==='dark'||h==='light')document.documentElement.setAttribute('data-theme',h)}catch(_){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
