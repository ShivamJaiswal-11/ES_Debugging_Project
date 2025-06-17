"use client"
import axios from "axios"
import { toast } from "react-hot-toast"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Send, Copy, Share, Zap, Play, RefreshCw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
// import { set } from "react-hook-form"

interface NodeInfo {
  name: string
  node_id: string
  pid: number
}

export default function JStackDiagnostics() {
  const [nodes, setNodes] = useState<NodeInfo[]>([])
  const [analysis, setAnalysis] = useState("")
  const [loading, setLoading] = useState(false)
  // const [rloading, setRLoading] = useState(false)
  const router = useRouter()
  const fetchNodes = async () => {
    setLoading(true)
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
      .finally(() => {
        setTimeout(() => {
          setLoading(false)
        }, 100) // Simulate a delay for loading state
      })
    }
  
  
  useEffect(() => {
    const clusterInit = localStorage.getItem("ClusterInit")
    if (clusterInit !== "true") {
      router.push("/")
    }
    else{
      const filtered_Nodes_lst = localStorage.getItem("filtered_Nodes_list")
      if (filtered_Nodes_lst) {
        const parsedNodes = JSON.parse(filtered_Nodes_lst) as NodeInfo[]
        if (parsedNodes.length > 0) {
          setNodes(parsedNodes)
        }
      } else {
        fetchNodes()
      }
    }
  }, [router])
  const  onClickRunHotThread= async () => {
    setAnalysis("") 
    toast.loading("Running hot threads analysis... Wait!")
    setLoading(true)
      axios.get("http://127.0.0.1:8000/analyze-hot-threads")
        .then((res) => {
          const hotThreads = res.data.analysis
          setAnalysis(hotThreads)
          toast.dismiss()
          toast.success("Hot threads analysis completed successfully.")
          setLoading(false)
        })
        .catch((err) => {
          // console.error("Error fetching hot threads:", err)
          toast.error("Failed to fetch hot threads. Please try again.")
          setLoading(false)
          toast.dismiss()
        })
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(analysis)
    toast.success("Analysis copied to clipboard.")
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
    setAnalysis("") 
    setLoading(true)
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
      <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">LLM-Powered Jstack Diagnostics</h1>
        <p className="text-muted-foreground">
          Fire Jstack to analyze your Elasticsearch cluster and get AI-generated recommendations.
        </p>
      </div>
        <Button onClick={fetchNodes} className="hover:cursor-pointer" disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
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
           <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Node name</TableHead>
                <TableHead>Node ID</TableHead>
                <TableHead>PID</TableHead>
                <TableHead>Fire Jstack</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nodes.map((Node) => (
                <TableRow key={Node.name}>
                  <TableCell className="font-medium">{Node.name}</TableCell>
                  <TableCell>{Node.node_id}</TableCell>
                  <TableCell>{Node.pid?.toLocaleString()}</TableCell>
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
