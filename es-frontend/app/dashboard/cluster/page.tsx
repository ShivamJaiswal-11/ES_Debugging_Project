"use client"

import axios from "axios"
import { toast } from "react-hot-toast"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw, Server, Database, Activity, AlertTriangle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface ClusterHealth {
  status: "green" | "yellow" | "red"
  cluster_name: string
  number_of_nodes: number
  number_of_data_nodes: number
  active_primary_shards: number
  active_shards: number
  unassigned_shards: number
  pending_tasks: string
}

export default function ClusterOverview() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [clusterHealth, setClusterHealth] = useState<ClusterHealth | null>(null)

  const fetchClusterHealth = async () => {
    setLoading(true)
    const selectedCluster = localStorage.getItem("SelectedClusterName")
    axios
      .get("http://127.0.0.1:8000/get-cluster-health?cluster_name=" + selectedCluster)
      .then((response) => {
        const data = response.data
        const health: ClusterHealth = {
          status: data.status,
          cluster_name: data.cluster_name,
          number_of_nodes: data.number_of_nodes,
          number_of_data_nodes: data.number_of_data_nodes,
          active_primary_shards: data.active_primary_shards,
          active_shards: data.active_shards,
          unassigned_shards: data.unassigned_shards,
          pending_tasks: data.number_of_pending_tasks,
        }
        setLastUpdated(new Date())
        setClusterHealth(health)
      })
      .catch((error) => {
        toast.error("Failed to fetch cluster health.", error)
      })
      .finally(() => {
        setTimeout(() => {
          setLoading(false)
        }, 100)
      })
  }

  useEffect(() => {
    const clusterInit = localStorage.getItem("ClusterInit")
    if (clusterInit !== "true") {
      router.push("/")
    }
    fetchClusterHealth()
  }, [router])

  const getHealthColor = (status: string) => {
    switch (status) {
      case "green":
        return "bg-green-500"
      case "yellow":
        return "bg-yellow-500"
      case "red":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getHealthVariant = (status: string) => {
    switch (status) {
      case "green":
        return "default"
      case "yellow":
        return "secondary"
      case "red":
        return "destructive"
      default:
        return "outline"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cluster Overview</h1>
          <p className="text-muted-foreground">Monitor your Elasticsearch cluster health and statistics</p>
        </div>
        <Button onClick={fetchClusterHealth} className="hover:cursor-pointer" disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {lastUpdated && <p className="text-sm text-muted-foreground">Last updated: {lastUpdated.toLocaleString()}</p>}

      {clusterHealth && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cluster Health</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className={`h-3 w-3 rounded-full ${getHealthColor(clusterHealth.status)}`} />
                <Badge variant={getHealthVariant(clusterHealth.status)}>{clusterHealth.status.toUpperCase()}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{clusterHealth.cluster_name}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nodes</CardTitle>
              <Server className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clusterHealth.number_of_nodes}</div>
              <p className="text-xs text-muted-foreground">{clusterHealth.number_of_data_nodes} data nodes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Shards</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clusterHealth.active_shards}</div>
              <p className="text-xs text-muted-foreground">{clusterHealth.active_primary_shards} primary</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unassigned Shards</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clusterHealth.unassigned_shards}</div>
              <p className="text-xs text-muted-foreground">Requires attention if &gt; 0</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Cluster Information</CardTitle>
          <CardDescription>Additional cluster details and pending tasks information</CardDescription>
        </CardHeader>
        <CardContent>
          {clusterHealth && (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-2">Pending Tasks</h4>
                <p className="text-2xl font-bold text-green-600">{clusterHealth.pending_tasks}</p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Cluster Name</h4>
                <p className="text-lg">{clusterHealth.cluster_name}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
