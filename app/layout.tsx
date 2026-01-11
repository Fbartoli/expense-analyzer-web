import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'UBS CSV Analyzer',
  description: 'Analyze your UBS bank statement CSV files and gain financial insights',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 antialiased">
        {children}
      </body>
    </html>
  )
}
