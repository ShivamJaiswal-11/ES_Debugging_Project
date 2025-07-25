"use client"

import axios from "axios"
import { toast } from "react-hot-toast"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Search, RefreshCw, Folder, Hash, Activity, HardDrive } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface IndexInfo {
  name: string
  docCount: number
  size: string
  health: "green" | "yellow" | "red"
}

export default function IndicesExplorer() {

  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [indices, setIndices] = useState<IndexInfo[]>([])
  const [filteredIndices, setFilteredIndices] = useState<IndexInfo[]>([])

  const fetchIndices = async () => {
    setLoading(true)
    const selectedCluster = localStorage.getItem("SelectedClusterName")
    axios
      .get(`http://127.0.0.1:8000/get-top-indices?cluster_name=${selectedCluster}&top_n=0`)
      .then((res) => {
        const indexNames = res.data
        const indexInfoResponses = indexNames.map((indexx: any) => {
          const info: IndexInfo =
          {
            name: indexx.index,
            health: indexx.health,
            size: indexx.store_size,
            docCount: indexx.docs_count,
          }
          return info
        }
        )
        setIndices(indexInfoResponses)
        localStorage.setItem("Indices_list", JSON.stringify(indexInfoResponses));
      })
      .catch((err) => {
        toast.error("Failed to fetch indices list.", err)
        setIndices([])
        localStorage.setItem("Indices_list", JSON.stringify([]));
      })
      .finally(() => {
        setTimeout(() => {
          setLoading(false)
        }, 100);
      })
  }

  useEffect(() => {
    const clusterInit = localStorage.getItem("ClusterInit")
    if (clusterInit !== "true") {
      router.push("/")
    } else {
      const indices_lst = localStorage.getItem("Indices_list")
      if (indices_lst) {
        const parsedIndices = JSON.parse(indices_lst) as IndexInfo[]
        if (parsedIndices.length > 0) {
          setIndices(parsedIndices)
        }
      }
      fetchIndices()
    }
  }, [router])

  useEffect(() => {
    const filtered = indices.filter((index) => index.name.toLowerCase().includes(searchTerm.toLowerCase()))
    setFilteredIndices(filtered)
  }, [searchTerm, indices])

  const getHealthVariant = (health: string) => {
    switch (health) {
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
          <h1 className="text-3xl font-bold tracking-tight">Indices Explorer</h1>
          <p className="text-muted-foreground">Browse and manage your Elasticsearch indices</p>
        </div>
        <Button onClick={fetchIndices} disabled={loading} className="hover:cursor-pointer">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Indices</CardTitle>
          <CardDescription>Filter indices by name to find what you're looking for</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by index name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Indices ({filteredIndices.length})</CardTitle>
          <CardDescription>Overview of all indices in your cluster</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><div className="flex flex-row space-x-2 items-center justify-start"><Folder /> <div>Index Name </div></div></TableHead>
                <TableHead><div className="flex flex-row space-x-2 items-center justify-start"><Hash /> <div>Docs Count </div></div></TableHead>
                <TableHead><div className="flex flex-row space-x-2 items-center justify-start"><HardDrive /> <div>Stored Size </div></div></TableHead>
                <TableHead><div className="flex flex-row space-x-2 items-center justify-start"><Activity /> <div>Health </div></div></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIndices.map((index) => (
                <TableRow key={index.name}>
                  <TableCell className="font-medium">{index.name}</TableCell>
                  <TableCell>{index.docCount.toLocaleString()}</TableCell>
                  <TableCell>{index.size}</TableCell>
                  <TableCell>
                    <Badge variant={getHealthVariant(index.health)}>{index.health}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
