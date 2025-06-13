import type React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { Navbar } from "@/components/navbar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Toaster } from "react-hot-toast"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Navbar />
        <main className="flex-1 space-y-4 p-4 md:p-8">{children}</main>
        <Toaster position="top-right" reverseOrder={false} />
      </SidebarInset>
    </SidebarProvider>
  )
}
