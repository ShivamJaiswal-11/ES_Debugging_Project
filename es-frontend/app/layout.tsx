import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { Toaster } from "react-hot-toast"
import ThemeRegistry from "@/components/theme-registry"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Elasticsearch Diagnostics & Monitoring Tool",
  description: "Comprehensive dashboard for monitoring and diagnosing Elasticsearch clusters",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <NextThemesProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ThemeRegistry>
            {children}
            <Toaster
              position="top-right"
              reverseOrder={false}
              toastOptions={{
                style: {
                  background: '#1f2937', 
                  color: '#fff',         
                },
                success: {
                  style: {
                    background: '#16a34a', 
                  },
                },
                error: {
                  style: {
                    background: '#dc2626', 
                  },
                },
              }}
            />
          </ThemeRegistry>
        </NextThemesProvider>
      </body>
    </html>
  )
}
