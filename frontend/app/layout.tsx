import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Navbar } from "@/components/navbar"
import { Toaster } from "@/components/ui/toaster"
import ClientSessionProvider from '@/components/ClientSessionProvider';

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "E-Commerce Store",
  description: "Amazon-style e-commerce application",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">  
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
