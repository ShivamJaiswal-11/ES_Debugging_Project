"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useRouter } from "next/navigation"

export function Navbar() {
  const { theme, setTheme } = useTheme()
  const router=useRouter();

  const onClickChangeCluster=()=>{
    router.push('/')
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1 hover:cursor-pointer" />
      <div className="flex-1">
        <h1 className="text-xl font-semibold">Elasticsearch Diagnostics & Monitoring</h1>
      </div>
      <Button className="mr-4 hover:cursor-pointer bg-blue-200 dark:bg-zinc-700 hover:bg-blue-100 hover:dark:bg-zinc-800 text-black dark:text-white" onClick={onClickChangeCluster}>Change Cluster</Button>
      <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "light" ? "dark" : "light")} className="hover:cursor-pointer bg-blue-200 dark:bg-zinc-700 hover:bg-blue-100 hover:dark:bg-zinc-800">
        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    </header>
  )
}
