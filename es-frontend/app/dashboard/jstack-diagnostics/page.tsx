"use client"

import { useEffect, useState } from "react"
import { Send, Copy, Share, Zap } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import { Textarea } from "@/components/ui/textarea"

import { Search, RefreshCw, Play } from "lucide-react"

import { Badge } from "@/components/ui/badge"
// import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import axios from "axios"
import { toast } from "react-hot-toast"
import { set } from "react-hook-form"

interface NodeInfo {
  name: string
  node_id: string
  pid: number
}

interface Sorted_index {
  index: string
  metric: number
}
export default function IssueStitcher() {
  const [issueDescription, setIssueDescription] = useState("")
  const [nodes, setNodes] = useState<NodeInfo[]>([])
  const [analysis, setAnalysis] = useState("")
  const [loading, setLoading] = useState(false)
  // const { toast } = useToaster()
  const router = useRouter()
    const fetchNodes = async () => {
      setLoading(true)
      try {
         axios
          .get("http://127.0.0.1:8000/nodes")
          .then(async (res) => {
            const nodeNames = res.data.nodes
            // console.log(res.data)
              const NodeInfoResponses= nodeNames.map((nodes:any) =>{
                const info: NodeInfo = {
                  name: nodes.name,
                  node_id: nodes.node_id,
                  pid: nodes.pid,
                }
                return info
              })
              setNodes(NodeInfoResponses)
              localStorage.setItem("filtered_Nodes_list", JSON.stringify(NodeInfoResponses))
          })
          .catch((err) => {
            // console.error("Error fetching indices list:", err)
            toast.error("Failed to fetch nodes. Please try again.")
          })
      } catch (error) {
        // console.error("Failed to fetch indices:", error)
        toast.error("Failed to fetch nodes. Please try again.")
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
      // const stored_n_val = localStorage.getItem("N_val")
      // const stored_sortBy = localStorage.getItem("SortBy")
      // if (stored_n_val) {
      //   setN_val(stored_n_val)
      // }
      // if (stored_sortBy) {
      //   setSortBy(stored_sortBy)
      // }
      const filtered_Nodes_lst = localStorage.getItem("filtered_Nodes_list")
      if (filtered_Nodes_lst) {
        const parsedNodes = JSON.parse(filtered_Nodes_lst) as NodeInfo[]
        if (parsedNodes.length > 0) {
          setNodes(parsedNodes)
          // setFilteredNodes(parsedNodes)
        }
      } else {
        fetchNodes()
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
  const  onClickRunHotThread= async () => {
    // if (!issueDescription.trim()) return
    setAnalysis("") // Clear previous analysis
    toast.loading("Running hot threads analysis... Wait!")
    setLoading(true)
  
      axios.get("http://127.0.0.1:8000/analyze-hot-threads")
        .then((res) => {
          const hotThreads = res.data.analysis
          setAnalysis(hotThreads)
          toast.dismiss()
          toast.success("Hot threads analysis completed successfully.")
          setLoading(false)

        // toast({
          //   title: "Analysis Completed",
          //   description: "Hot threads analysis completed successfully.",
          // })
        })
        .catch((err) => {
          // console.error("Error fetching hot threads:", err)
          toast.error("Failed to fetch hot threads. Please try again.")
          setLoading(false)
          toast.dismiss()
          // toast({
          //   title: "Error",
          //   description: "Failed to fetch hot threads. Please try again.",
          //   variant: "destructive",
          // })
        })
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(analysis)
    toast.success("Analysis copied to clipboard.")
    // toast({
    //   title: "Copied!",
    //   description: "Analysis copied to clipboard.",
    // })
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
  const handleDiagnose = (indexName: string) => {
    setAnalysis("") // Clear previous analysis
    setLoading(true) // Set loading state
    toast.loading("Analyzing issue...")
    axios
      .post("http://127.0.0.1:8000/analyze-by-node", { node_name: indexName })
      .then((res) => {
        setAnalysis(res.data.analysis)
        toast.dismiss()
        toast.success("Analysis completed successfully.")
        setLoading(false)
      }
      )
      .catch((err) => {
        // console.error("Error analyzing issue:", err)
        toast.dismiss()
        toast.error("Failed to analyze the issue. Please try again.")
        setLoading(false)
      }
    )
  }
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
                <TableHead>Node name</TableHead>
                <TableHead>Node ID</TableHead>
                <TableHead>PID</TableHead>
                <TableHead>Fire Jstack</TableHead>
                {/* <TableHead>Fire Jstack</TableHead> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {nodes.map((Node) => (
                <TableRow key={Node.name}>
                  <TableCell className="font-medium">{Node.name}</TableCell>
                  <TableCell>{Node.node_id}</TableCell>
                  <TableCell>{Node.pid?.toLocaleString()}</TableCell>
                  {/* <TableCell>
                    <Badge variant={getHealthVariant(Node.health)}>{Node.health}</Badge>
                  </TableCell> */}
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => handleDiagnose(Node.name)}  disabled={loading} className="hover:cursor-pointer">
                      <Play className="mr-2 h-3 w-3" />
                      Diagnose
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button onClick={onClickRunHotThread} disabled={loading} className="w-full hover:cursor-pointer">
            <Send className={`mr-2 h-4 w-4 ${loading ? "animate-pulse" : ""}`} />
            Run Hot Threads
            {/* {loading ? "Running Hot Threads.." : "Run Hot Threads"} */}
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
                <Button variant="outline" size="sm" onClick={copyToClipboard} className="hover:cursor-pointer">
                  <Copy className="mr-2 h-4 w-4" />
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={shareAnalysis} className="hover:cursor-pointer">
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
