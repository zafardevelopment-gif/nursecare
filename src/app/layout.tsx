import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NurseCare+ | Home Healthcare Marketplace',
  description: 'Connect with verified nurses, doctors, and healthcare professionals for trusted home care in Saudi Arabia.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
