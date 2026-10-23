import type { Metadata } from 'next'
import AppProviders from '@/app/store/providers/providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'X-Notes',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
