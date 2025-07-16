"use client"

import axios from "axios"
import { useTheme } from "next-themes"
import { toast } from "react-hot-toast"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Server, Moon, Sun, MoveRight } from "lucide-react"

import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface cluster_info {
  clusterName: string;
  clusterHost: string;
}

export default function HomePage() {

  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [disableButton_1, setDisableButton_1] = useState(false)
  const [clusterList, setClusterList] = useState<cluster_info[]>([])
  const [selectedCluster, setSelectedCluster] = useState<string>("")

  useEffect(() => {
    axios.get("http://127.0.0.1:8000/cluster-list")
      .then((response) => {
        setClusterList(response.data)
      })
      .catch((err) => {
        toast.error("Failed to fetch cluster list", err)
      })
  }, [])


  function onclickSubmit() {
    setDisableButton_1(true)
    if (selectedCluster) {
      localStorage.setItem("SelectedClusterName", selectedCluster);
      localStorage.setItem("ClusterInit", "true");
      toast.success("Cluster initialized successfully!")
      setTimeout(() => {
        router.push("/dashboard/cluster")
      }, 400);
    } else {
      alert("Please select a cluster to continue.")
      setDisableButton_1(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "light" ? "dark" : "light")} className="hover:cursor-pointer bg-blue-200 hover:bg-blue-100 dark:bg-zinc-800 dark:hover:bg-zinc-900">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>

      <Card className="w-full max-w-2xl min-h-96 align-middle content-center">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl flex items-center justify-center gap-4">
            <Server className="h-6 w-6" />
            Select Elasticsearch Cluster
          </CardTitle>
          <CardDescription>Choose the cluster you want to monitor and diagnose</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 w-full">
          <div>
            <div>
              <RadioGroup value={selectedCluster} onValueChange={setSelectedCluster} className="overflow-y-scroll max-h-[400px]">
                {clusterList.map((cluster) => (
                  <div key={cluster.clusterName} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 bg-white dark:bg-black hover:dark:bg-muted/50">
                    <RadioGroupItem value={cluster.clusterHost} id={cluster.clusterName} />
                    <Label htmlFor={cluster.clusterName} className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{cluster.clusterName}</div>
                        </div>
                      </div>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              <div className="pt-8 w-full flex justify-center pb-8">
                <Button type="submit" className={`w-3/4 h-12 flex flex-row hover:cursor-pointer enabled:${disableButton_1}`} disabled={disableButton_1} onClick={onclickSubmit}>
                  <div >
                    Continue
                  </div>
                  <MoveRight className="" strokeWidth={3} />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
