"use client"

import { useState, useEffect } from "react"
import { Search, RefreshCw, Play } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

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

  const fetchIndices = async () => {
    setLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const mockIndices: IndexInfo[] = [
        { name: "logs-2024.01", docCount: 1250000, size: "2.1 GB", health: "green" },
        { name: "users", docCount: 45000, size: "125 MB", health: "green" },
        { name: "products", docCount: 12000, size: "45 MB", health: "yellow" },
        { name: "orders-2024", docCount: 890000, size: "1.8 GB", health: "green" },
        { name: "analytics", docCount: 2100000, size: "3.2 GB", health: "green" },
        { name: "sessions", docCount: 750000, size: "890 MB", health: "red" },
      ]

      setIndices(mockIndices)
      setFilteredIndices(mockIndices)
    } catch (error) {
      console.error("Failed to fetch indices:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIndices()
  }, [])

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
        <Button onClick={fetchIndices} disabled={loading}>
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
                <TableHead>Actions</TableHead>
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
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => handleQueryMonitor(index.name)}>
                      <Play className="mr-2 h-3 w-3" />
                      Query Monitor
                    </Button>
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
