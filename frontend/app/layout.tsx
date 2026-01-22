import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Navbar } from "@/components/navbar"
import { Toaster } from "@/components/ui/toaster"
import ClientSessionProvider from '@/components/ClientSessionProvider';

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Smart Kart",
  description: "Smartkart e-commerce application",
  generator: 'v0.dev',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      </head>
      <body className={inter.className}>
        <ClientSessionProvider>
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <Toaster />
        </ClientSessionProvider>
      </body>
    </html>
  )
}
