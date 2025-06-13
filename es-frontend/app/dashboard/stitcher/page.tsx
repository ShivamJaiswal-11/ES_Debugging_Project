"use client"

import { useEffect, useState } from "react"
import { Send, Copy, Share, Zap } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Textarea } from "@/components/ui/textarea"

import { Search, RefreshCw, Play } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import axios from "axios"

interface IndexInfo {
  name: string
  docCount: number
  size: string
  health: "green" | "yellow" | "red"
}

interface Sorted_index {
  index: string
  metric: number
}
export default function IssueStitcher() {
  const [issueDescription, setIssueDescription] = useState("")
  const [indices, setIndices] = useState<IndexInfo[]>([])
  const [analysis, setAnalysis] = useState("")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const [n_val,setN_val]=useState("")    
  const [sortBy,setSortBy]=useState("")


    const fetchIndices = async () => {
      setLoading(true)
      try {
         axios
          .get<string[]>("http://127.0.0.1:8000/indices")
          .then(async (res) => {
            const indexNames = res.data
            // console.log(res.data)
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
                    console.error(`Error fetching info for index ${index}:`, error)
                    return null
                  })
              )
            )
              // console.log(indexInfoResponses)
            const validInfo = indexInfoResponses.filter(
              (info): info is IndexInfo => info !== null
            )
            setIndices(validInfo)
          })
          .catch((err) => console.error("Error fetching indices list:", err))
    
        // setIndices(mockIndices)
        // setFilteredIndices(mockIndices)
      } catch (error) {
        console.error("Failed to fetch indices:", error)
      } finally {
        setLoading(false)
      }
    }
  
  
  useEffect(() => {
    const clusterInit = localStorage.getItem("ClusterInit")
    if (clusterInit !== "true") {
      router.push("/")
    }
    else{
      const stored_n_val = localStorage.getItem("N_val")
      const stored_sortBy = localStorage.getItem("SortBy")
      if (stored_n_val) {
        setN_val(stored_n_val)
      }
      if (stored_sortBy) {
        setSortBy(stored_sortBy)
      }
      const filtered_indices_lst = localStorage.getItem("filtered_indices_list")
      if (filtered_indices_lst) {
        const parsedIndices = JSON.parse(filtered_indices_lst) as IndexInfo[]
        if (parsedIndices.length > 0) {
          setIndices(parsedIndices)
          // setFilteredIndices(parsedIndices)
        }
      } else {
        fetchIndices()
      }
      // fetchIndices()
    }
  }, [router])
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
  const  onClickFireJstack= async () => {
    if (!issueDescription.trim()) return

    setLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      const mockAnalysis = `# Elasticsearch Issue Analysis`
      setAnalysis(mockAnalysis)
    } catch (error) {
      console.error("Failed to analyze issue:", error)
      toast({
        title: "Error",
        description: "Failed to analyze the issue. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(analysis)
    toast({
      title: "Copied!",
      description: "Analysis copied to clipboard.",
    })
  }

  const shareAnalysis = () => {
    if (navigator.share) {
      navigator.share({
        title: "Elasticsearch Issue Analysis",
        text: analysis,
      })
    } else {
      copyToClipboard()
    }
  }
  // const handleDiagnose = (indexName: string) => {
  //   // Navigate to query monitor with pre-filled index
  //   window.location.href = `/dashboard/monitor?index=${indexName}`
  // }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">LLM-Powered Jstack Diagnostics</h1>
        <p className="text-muted-foreground">
          Fire Jstack to analyze your Elasticsearch cluster and get AI-generated recommendations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Top N Indices
          </CardTitle>
          <CardDescription>Overview of top N indices in your cluster</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* <Textarea
            placeholder="Describe your Elasticsearch issue here... Include symptoms, error messages, performance metrics, cluster configuration, and any recent changes."
            value={issueDescription}
            onChange={(e) => setIssueDescription(e.target.value)}
            rows={8}
            className="min-h-[200px]"
          /> */}
           <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Index Name</TableHead>
                <TableHead>Document Count</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Health</TableHead>
                {/* <TableHead>Fire Jstack</TableHead> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {indices.map((index) => (
                <TableRow key={index.name}>
                  <TableCell className="font-medium">{index.name}</TableCell>
                  <TableCell>{index.docCount.toLocaleString()}</TableCell>
                  <TableCell>{index.size}</TableCell>
                  <TableCell>
                    <Badge variant={getHealthVariant(index.health)}>{index.health}</Badge>
                  </TableCell>
                  {/* <TableCell>
                    <Button size="sm" variant="outline" onClick={() => handleDiagnose(index.name)}>
                      <Play className="mr-2 h-3 w-3" />
                      Diagnose
                    </Button>
                  </TableCell> */}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button onClick={onClickFireJstack} disabled={loading} className="w-full">
            <Send className={`mr-2 h-4 w-4 ${loading ? "animate-pulse" : ""}`} />
            {loading ? "Firing Jstack..." : "Fire Jstack"}
          </Button>
        </CardContent>
      </Card>

      {analysis && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>AI Analysis & Recommendations</CardTitle>
                <CardDescription>Generated analysis based on your issue description</CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" onClick={copyToClipboard}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={shareAnalysis}>
                  <Share className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <pre className="whitespace-pre-wrap text-sm leading-relaxed">{analysis}</pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
