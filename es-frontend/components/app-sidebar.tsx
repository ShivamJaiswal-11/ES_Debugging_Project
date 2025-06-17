"use client"

import { Activity, BarChart3, Database, Home, Search, Zap } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar"

const navigationItems = [
  {
    title: "Cluster Overview",
    url: "/dashboard/cluster",
    icon: Home,
  },
  {
    title: "Indices Explorer",
    url: "/dashboard/indices",
    icon: Database,
  },
  {
    title: "Top Indices",
    url: "/dashboard/top-indices",
    icon: Database,
  },
  {
  title: "Time Series Data",
  url: "/dashboard/extracted-data",
  icon: BarChart3,
},
  {
    title: "JStack Diagnostics",
    url: "/dashboard/jstack-diagnostics",
    icon: Zap,
  },
  {
    title: "Query Monitor",
    url: "/dashboard/query-monitor",
    icon: Activity,
  },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          {/* <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
            <Search className="h-4 w-4 text-primary-foreground" />
          </div> */}
          <div>
            <h2 className="text-lg font-semibold">ES Monitor</h2>
            <p className="text-xs text-muted-foreground">Diagnostics Tool</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
