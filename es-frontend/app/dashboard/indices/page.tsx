"use client"
import axios from "axios"
import { toast } from "react-hot-toast"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Search, RefreshCw } from "lucide-react"
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

  const [indices, setIndices] = useState<IndexInfo[]>([])
  const [filteredIndices, setFilteredIndices] = useState<IndexInfo[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const fetchIndices = async () => {
    setLoading(true)
      axios
      .get<string[]>("http://127.0.0.1:8000/indices")
      .then(async (res) => {
        const indexNames = res.data
          const indexInfoResponses= await Promise.all(indexNames.map((index) =>
            axios
              .post("http://127.0.0.1:8000/index/info", {
                index: index,
              })
              .then((response) => {
                const info: IndexInfo = {
                  name: response.data.index_name,
                  docCount: response.data.doc_count,
                  size: `${response.data.size_in_bytes} bytes`,
                  health: response.data.health_status,
                }
                // console.log(info)
                return info
              })
              .catch((error) => {
                // console.error(`Error fetching info for index ${index}:`, error)
                toast.error(`Failed to fetch info for index ${index}.`)
                return null
              })
          )
        )
          // console.log(indexInfoResponses)
        const validInfo = indexInfoResponses.filter(
          (info): info is IndexInfo => info !== null
        )
        setIndices(validInfo)
        localStorage.setItem("Indices_list", JSON.stringify(validInfo));
      })
      .catch((err) =>
        {
          // console.error("Error fetching indices list:", err)
          toast.error("Failed to fetch indices list.")
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
    }else{
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

  const handleQueryMonitor = (indexName: string) => {
    // Navigate to query monitor with pre-filled index
    window.location.href = `/dashboard/monitor?index=${indexName}`
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
              placeholder="Search indices..."
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
                <TableHead>Index Name</TableHead>
                <TableHead>Document Count</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Health</TableHead>
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
