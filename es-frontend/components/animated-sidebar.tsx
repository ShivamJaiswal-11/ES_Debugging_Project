"use client"

import Link from "next/link"
import type React from "react"
import { useState } from "react"
import { useTheme } from "next-themes"
import { usePathname, useRouter } from "next/navigation"
import { motion, AnimatePresence, Variants } from "framer-motion"
import { Menu, X, Home, BarChart3, AlertTriangle, Moon, Sun, Database, Zap, PencilLine, Bot } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"


const navigationItems = [
  {
    title: "Cluster Overview",
    url: "/dashboard/cluster",
    icon: Home,
    description: "Cluster overview and health",
  },
  {
    title: "Indices Explorer",
    url: "/dashboard/indices",
    icon: Database,
    description: "List of all Indices",
  },
  {
    title: "Top Indices",
    url: "/dashboard/top-indices",
    icon: Database,
    description: "Filter top n indices",
  },
  {
    title: "Time Series Data",
    url: "/dashboard/extracted-data",
    icon: BarChart3,
    description: "Plot of time series data",
  },
  {
    title: "Cluster Debugging",
    url: "/dashboard/debugging",
    icon: AlertTriangle,
    description: "Debugging panel for nodes",
  },
  {
    title: "Smart Debug Chat",
    url: "/dashboard/chatbot?apitool=true",
    icon: Bot,
    description: "LLM response using es-tools",
  },
]
interface AnimatedSidebarProps {
  children: React.ReactNode
}

export function AnimatedSidebar({ children }: AnimatedSidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  const toggleSidebar = () => {
    setIsOpen(!isOpen)
  }

  const sidebarVariants = {
    open: {
      x: 0,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 30,
      },
    },
    closed: {
      x: -280,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 30,
      },
    },
  }

  const overlayVariants = {
    open: {
      opacity: 1,
      visibility: "visible" as const,
      transition: {
        duration: 0.3,
      },
    },
    closed: {
      opacity: 0,
      visibility: "hidden" as const,
      transition: {
        duration: 0.3,
      },
    },
  }

  const itemVariants: Variants = {
    open: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
    closed: {
      opacity: 0,
      x: -20,
      transition: {
        duration: 0.2,
      },
    },
  }
  const router = useRouter();
  const onClickChangeCluster = () => {
    router.push('/')
  }

  return (
    <div className="relative min-h-screen">
      <header className="fixed top-0 left-0 right-0 z-50 flex h-16 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="h-8 w-8 hover:bg-zinc-700 bg-zinc-900 text-zinc-100 hover:text-zinc-50 dark:bg-white dark:text-black dark:hover:bg-zinc-200 dark:hover:text-black">
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X className="h-4 w-4" />
              </motion.div>
            ) : (
              <motion.div
                key="menu"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Menu className="h-4 w-4" />
              </motion.div>
            )}
          </AnimatePresence>
          <span className="sr-only">Toggle sidebar</span>
        </Button>

        <div className="flex-1">
          <h1 className="text-xl font-semibold">Elasticsearch Diagnostics & Monitoring</h1>
        </div>

        <Button className="mr-4 hover:cursor-pointer bg-blue-200 dark:bg-zinc-700 hover:bg-blue-100 hover:dark:bg-zinc-800 text-black dark:text-white" onClick={onClickChangeCluster}>
          <PencilLine />
          Change Cluster
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "light" ? "dark" : "light")} className="hover:cursor-pointer bg-blue-200 dark:bg-zinc-700 hover:bg-blue-100 hover:dark:bg-zinc-800">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </header>

      <motion.div
        variants={overlayVariants}
        animate={isOpen ? "open" : "closed"}
        className="fixed inset-0 bg-black/50 z-30 md:hidden"
        style={{ top: "64px" }}
        onClick={() => setIsOpen(false)}
      />

      <motion.aside
        variants={sidebarVariants}
        animate={isOpen ? "open" : "closed"}
        className="fixed left-0 w-[280px] bg-card border-r border-border z-40 shadow-lg"
        style={{
          top: "64px",
          height: "calc(100vh - 64px)",
        }}
      >
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-bold">ES Monitor</h2>
                <p className="text-sm text-muted-foreground">Diagnostics Tool</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              <AnimatePresence>
                {isOpen &&
                  navigationItems.map((item, index) => {
                    const isActive =
                      pathname === item.url || (item.url !== "/dashboard/cluster" && pathname.startsWith(item.url))

                    return (
                      <motion.li
                        key={item.title}
                        variants={itemVariants}
                        initial="closed"
                        animate="open"
                        exit="closed"
                        transition={{ delay: index * 0.1 }}
                      >
                        <Link
                          href={item.url}
                          onClick={() => setIsOpen(false)}
                          className={cn(
                            "flex items-center gap-4 px-4 py-3 rounded-lg text-left transition-all duration-200 group",
                            "hover:bg-accent hover:text-accent-foreground",
                            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                            isActive ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary" : "text-foreground",
                          )}
                        >
                          <item.icon
                            className={cn(
                              "h-5 w-5 transition-transform duration-200",
                              "group-hover:scale-110",
                              isActive ? "text-primary-foreground" : "text-muted-foreground",
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <div
                              className={cn(
                                "font-medium text-base",
                                isActive ? "text-primary-foreground" : "text-foreground",
                              )}
                            >
                              {item.title}
                            </div>
                            <div
                              className={cn(
                                "text-xs mt-0.5 truncate",
                                isActive ? "text-primary-foreground/80" : "text-muted-foreground",
                              )}
                            >
                              {item.description}
                            </div>
                          </div>
                        </Link>
                      </motion.li>
                    )
                  })}
              </AnimatePresence>
            </ul>
          </nav>

          <div className="p-4 border-t border-border">
            <div className="text-xs text-muted-foreground text-center">
              <p>Elasticsearch Dashboard</p>
              <p className="mt-1">v1.0.0</p>
            </div>
          </div>
        </div>
      </motion.aside>

      <main
        className="transition-all duration-300"
        style={{
          marginTop: "64px",
          minHeight: "calc(100vh - 64px)",
          paddingLeft: isOpen ? "280px" : "0",
        }}
      >
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  )
}
