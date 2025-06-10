"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Server, ArrowRight, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { ComboBox } from "@/components/combo-box"
import { Input } from "@/components/ui/input"
const clusters = [
  {
    id: "prod-cluster-1",
    name: "Production Cluster 1",
    url: "https://prod-es-1.company.com:9200",
    status: "healthy",
    nodes: 5,
  },
  {
    id: "prod-cluster-2",
    name: "Production Cluster 2",
    url: "https://prod-es-2.company.com:9200",
    status: "warning",
    nodes: 3,
  },
  {
    id: "staging-cluster",
    name: "Staging Cluster",
    url: "https://staging-es.company.com:9200",
    status: "healthy",
    nodes: 2,
  },
  {
    id: "dev-cluster",
    name: "Development Cluster",
    url: "http://localhost:9200",
    status: "healthy",
    nodes: 1,
  },
]

export default function HomePage() {
  const [localClusterUrl, setLocalClusterUrl] = useState("")
  const [cloudClusterUrl, setCloudClusterUrl] = useState("")
  const [enableButton, setEnableButton] = useState(false)
  const router = useRouter()
  const [val, setVal] = useState("")
  const { theme, setTheme } = useTheme()
  console.log("button:", enableButton)

  const handleContinue = () => {
    if (localClusterUrl && val === "local") {
      
      // Store selected cluster in localStorage or context
      // localStorage.setItem("selectedCluster", selectedCluster)
    }
    else if (cloudClusterUrl && val === "cloud") {
      // Store selected cluster in localStorage or context
      // localStorage.setItem("selectedCluster", selectedCluster)
    }
    else {
      alert("Please enter a valid URL for the selected cluster.")
      return
    }
    return
    // router.push("/dashboard/cluster")
  }

  // const getStatusColor = (status: string) => {
  //   switch (status) {
  //     case "healthy":
  //       return "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20"
  //     case "warning":
  //       return "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20"
  //     case "error":
  //       return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20"
  //     default:
  //       return "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20"
  //   }
  // }
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Theme toggle button */}
      <div className="absolute top-4 right-4">
        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>

      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl flex items-center justify-center gap-2">
            <Server className="h-6 w-6" />
            Select Elasticsearch Cluster
          </CardTitle>
          <CardDescription>Choose the cluster you want to monitor and diagnose</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 w-full">
          <div className="w-full flex items-center justify-center mb-4 flex-row">
            <ComboBox val={val} setVal={setVal} />
          </div>
          <div>
          {val=="local" ?
          <div className="text-center text-sm text-muted-foreground mb-4">
            <p>Please enter the URL where your local cluster is running.</p>
            <div className="mt-4">
              <Input type="url" placeholder="Cluster URL"  value={localClusterUrl}
                onChange={(e) => {setLocalClusterUrl(e.target.value);if(e.target.value!=""){setEnableButton(true)}else{setEnableButton(false);} }} />
            </div>
          </div>
          :
          <div>{val=="cloud" ?
          <div className="text-center text-sm text-muted-foreground mb-4">
            <p>Please enter the API of your cluster.</p>
            <div className="mt-4">
              <Input type="url" placeholder="Cluster API"  value={cloudClusterUrl}
                onChange={(e) => {setCloudClusterUrl(e.target.value);if(e.target.value!=""){setEnableButton(true)}else{setEnableButton(false);}}} />
            </div>
          </div>
          :
          <div className="text-center text-sm text-muted-foreground mb-4">
            <p>Please select a source to continue.</p>
          </div>}
          </div>
        }
          </div>
{/*           
          <RadioGroup value={selectedCluster} onValueChange={setSelectedCluster}>
            {clusters.map((cluster) => (
              <div key={cluster.id} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50">
                <RadioGroupItem value={cluster.id} id={cluster.id} />
                <Label htmlFor={cluster.id} className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{cluster.name}</div>
                      <div className="text-sm text-muted-foreground">{cluster.url}</div>
                      <div className="text-sm text-muted-foreground">{cluster.nodes} nodes</div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(cluster.status)}`}>
                      {cluster.status}
                    </span>
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup> */}

          <Button onClick={handleContinue} disabled={!enableButton} className="w-full" size="lg">
            Continue to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
