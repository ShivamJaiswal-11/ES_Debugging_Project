"use client"

import axios from "axios"
import Link from "next/link"
import { toast } from "react-hot-toast"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Send, Copy, Share, Zap, Play, RefreshCw, Bot } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface NodeInfo {
  name: string
  node_id: string
  pid: number
}

export default function JStackDiagnostics() {

  const router = useRouter()
  const [analysis, setAnalysis] = useState("")
  const [loading, setLoading] = useState(false)
  const [nodes, setNodes] = useState<NodeInfo[]>([])

  const fetchNodes = async () => {
    const clusterName = localStorage.getItem("SelectedClusterName")
    setLoading(true)
    axios
      .get("http://127.0.0.1:8000/nodes?cluster_name=" + clusterName)
      .then(async (res) => {
        const nodeNames = res.data
        const NodeInfoResponses = nodeNames.map((nodes: any) => {
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
        toast.error("Failed to fetch nodes.", err)
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
    else {
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

  const onClickRunHotThread = async (Node_Name: string) => {
    setAnalysis("")
    const clusterName = localStorage.getItem("SelectedClusterName")
    toast.loading("Analyzing hot threads Output...")
    setLoading(true)
    axios.get(`http://127.0.0.1:8000/analyze-hot-threads?cluster_name=${clusterName}&node_name=${Node_Name}`)
      .then((res) => {
        const hotThreads = res.data.analysis
        setAnalysis(hotThreads)
        toast.dismiss()
        toast.success("Hot threads analysis completed.")
        setLoading(false)
      })
      .catch((err) => {
        toast.error("Failed to fetch hot threads.", err)
        setLoading(false)
        toast.dismiss()
      })
  }

  const onClickRunFullAnalysis = async () => {
    const clusterName = localStorage.getItem("SelectedClusterName")
    setAnalysis("")
    toast.loading("Analyzing all outputs...")
    setLoading(true)
    axios.get("http://127.0.0.1:8000/analyze-by-full-dump?cluster_name=" + clusterName)
      .then((res) => {
        const fullDumpAnalysis = res.data.analysis
        setAnalysis(fullDumpAnalysis)
        toast.dismiss()
        toast.success("Analysis completed.")
        setLoading(false)
      })
      .catch((err) => {
        toast.error("Failed to fetch outputs.", err)
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

  const handleDiagnose = (Node_Name: string) => {
    const clusterName = localStorage.getItem("SelectedClusterName")
    setAnalysis("")
    setLoading(true)
    toast.loading("Analyzing JStack Output...")
    axios
      .get("http://127.0.0.1:8000/analyze-by-node?cluster_name=" + clusterName + "&node_name=" + Node_Name)
      .then((res) => {
        setAnalysis(res.data.analysis)
        toast.dismiss()
        toast.success("JStack analysis completed.")
        setLoading(false)
      }
      )
      .catch((err) => {
        toast.dismiss()
        toast.error("Failed to analyze the issue.", err)
        setLoading(false)
      }
      )
  }
  const handleAnalyze = (Node_Name: string) => {
    const clusterName = localStorage.getItem("SelectedClusterName")
    setAnalysis("")
    setLoading(true)
    toast.loading("Analyzing Running Tasks...")
    axios
      .get("http://127.0.0.1:8000/analyze-by-tasks?cluster_name=" + clusterName + "&node_name=" + Node_Name)
      .then((res) => {
        setAnalysis(res.data.analysis)
        toast.dismiss()
        toast.success("Running Tasks Analysis completed.")
        setLoading(false)
      }
      )
      .catch((err) => {
        toast.dismiss()
        toast.error("Failed to analyze the issue.", err)
        setLoading(false)
      }
      )
  }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">LLM-Powered Debugging</h1>
          <p className="text-muted-foreground">
            Fire Jstack, Run Hot_threads, and Get Tasks responses to analyze your Elasticsearch cluster and get AI-generated recommendations.
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
                <TableHead>Analyse JVM Output</TableHead>
                <TableHead>Analyse Hot_threads</TableHead>
                <TableHead>Analyse Running Tasks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nodes.map((Node) => (
                <TableRow key={Node.name}>
                  <TableCell className="font-medium">{Node.name}</TableCell>
                  <TableCell>{Node.node_id}</TableCell>
                  <TableCell>{Node.pid?.toLocaleString()}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => handleDiagnose(Node.name)} disabled={loading} className="hover:cursor-pointer">
                      <Play className="mr-2 h-3 w-3" />
                      Diagnose
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => onClickRunHotThread(Node.name)} disabled={loading} className="hover:cursor-pointer">
                      <Play className="mr-2 h-3 w-3" />
                      Diagnose
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => handleAnalyze(Node.name)} disabled={loading} className="hover:cursor-pointer">
                      <Play className="mr-2 h-3 w-3" />
                      Diagnose
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex flex-col space-y-4">
            <div className="flex justify-center pl-4">
              <Button onClick={onClickRunFullAnalysis} disabled={loading} className="w-full hover:cursor-pointer  bg-zinc-800 hover:bg-zinc-700 dark:bg-zinc-200 dark:hover:bg-zinc-100">
                <Send className={`mr-2 h-4 w-4 ${loading ? "animate-pulse" : ""}`} />
                Analyse All Outputs
              </Button>
            </div>
          </div>
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
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center space-y-2">
        <div className="relative bg-black dark:bg-white text-white dark:text-black text-sm px-3 py-1 rounded-full shadow-md animate-[float_3s_ease-in-out_infinite]">
          Ask Query
          <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-black dark:border-t-white" />
        </div>
        <Link href="/dashboard/chatbot?metric=false" className="hover:cursor-pointer">
          <div
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-black dark:bg-blue-50 relative flex items-center justify-center hover:bg-zinc-800 hover:dark:bg-blue-100"
          >
            <Bot className="text-blue-50 dark:text-black" size={30} />
            <span className="sr-only">Open Debugging Assistant</span>
          </div>
        </Link>
      </div>
    </div>
  )
}
