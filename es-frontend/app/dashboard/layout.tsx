import type React from "react"
import { AnimatedSidebar } from "@/components/animated-sidebar"
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AnimatedSidebar>
      {children}
    </AnimatedSidebar>
  )
}
