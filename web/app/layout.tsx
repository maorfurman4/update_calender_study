import type { Metadata, Viewport } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import './globals.css'

export const metadata: Metadata = {
  title: 'נדלן — דירות בישראל',
  description: 'מצא את הדירה שלך בקלות — השכרה, מכירה ושותפים בישראל',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'נדלן',
  },
  icons: {
    apple: '/apple-touch-icon.png',
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // prevent accidental zoom on mobile swipe UI
  themeColor: '#6B4F3A',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Provide all messages to client components.
  // next-intl 4.x: getMessages() reads from i18n/request.ts
  const messages = await getMessages()

  return (
    // CRITICAL: lang="he" + dir="rtl" — Hebrew RTL, never remove these.
    // No letter-spacing on font classes — Hebrew text renders poorly with it.
    <html lang="he" dir="rtl" className="h-full">
      <body
        className="h-full min-h-dvh antialiased"
        style={{
          backgroundColor: 'var(--color-bg)',
          color: 'var(--color-dark)',
          fontFamily: 'system-ui, -apple-system, Arial, sans-serif',
        }}
      >
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
