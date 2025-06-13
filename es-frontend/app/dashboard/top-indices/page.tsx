"use client"

import { useState, useEffect } from "react"
import { Search, RefreshCw, Play } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import axios from "axios"
import { ComboBox } from "@/components/combo-box"

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

// const optionLists=[
  // {
  //   values:"docs.count",
  //   labels:"d"
  // },
  // {
  //   values:"store.size",
  //   labels:"d"
  // },
  // {
  //   values:"indexing.index_total",
  //   labels:"d"
  // },
  // {
  //   values:"search.query_total",
  //   labels:"d"
  // },
// ]
const optionLists = [
   {
    value:"docs.count",
    label:"Docs Count"
  },
  {
    value:"store.size",
    label:"Size stored"
  },
  {
    value:"indexing.index_total",
    label:"Total indexing"
  },
  {
    value:"search.query_total",
    label:"Total search query"
  },
 
]
export default function IndicesExplorer() {
  const [indices, setIndices] = useState<IndexInfo[]>([])
  const [filteredIndices, setFilteredIndices] = useState<IndexInfo[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
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
          setFilteredIndices(parsedIndices)
        }
      } else {
        fetchIndices()
      }
      // fetchIndices()
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
  const onclickFilter = () => {

    // if( n_val === undefined || n_val === null) {
    //   alert("Please enter a value for N")
    //   return
    // }

    let n_val_num=1;
    try {
      n_val_num = Number(n_val)
      if (isNaN(n_val_num) || n_val_num <= 0) {
        alert("Please enter a valid number greater than 0")
        return
      }
    } catch (error) {
      alert("Please enter a valid number greater than 0")
      return
    }
    // if (n_val === "" || n_val === null) {
    if (n_val_num <= 0) {
      alert("Please enter a valid number greater than 0")
      return
    }
    if (sortBy === "") {
      alert("Please select a sorting option")
      return
    }
    localStorage.setItem("N_val", n_val_num.toString())
    localStorage.setItem("SortBy", sortBy)
    axios
    .get<Sorted_index[]>(`http://127.0.0.1:8000/top-indices?n=${n_val_num}&sort_by=${sortBy}`)
    .then(async (res) => {
      const indexNames = res.data
      console.log(res.data)
        const indexInfoResponses= await Promise.all(indexNames.map((index_data) =>
          axios
            .post("http://127.0.0.1:8000/index/info", {
              index: index_data.index,
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
              console.error(`Error fetching info for index ${index_data.index}:`, error)
              return null
            })
        )
      )
        // console.log(indexInfoResponses)
      const validInfo = indexInfoResponses.filter(
        (info): info is IndexInfo => info !== null
      )
      setIndices(validInfo)
      localStorage.setItem("filtered_indices_list", JSON.stringify(validInfo));
    })
    .catch((err) => console.error("Error fetching indices list:", err))

  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Top N Indices</h1>
          <p className="text-muted-foreground">Filter your Top N Elasticsearch indices</p>
        </div>
        <Button onClick={fetchIndices} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
      <div className="flex flex-row w-full">
        <Card className="w-1/2 m-2">
          <CardHeader>
            <CardTitle>Filter Top N Indices</CardTitle>
            <CardDescription>Filter and Sort indices by different metrics to find most active indices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative flex flex-row">
              <div className="relative flex flex-row w-5/6 p-2 h-full">
                {/* <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /> */}
                <Input
                  type="number"
                  placeholder="Enter value of N"
                  // value={searchTerm}
                  value={n_val}
                  onChange={(e) => setN_val((e.target.value))}
                  className="mr-8 w-3/5 h-full justify-center flex text-black dark:text-white dark:placeholder:text-gray-300 placeholder:text-zinc-800"
                />
                <div className="ml-4 w-2/3">
                  <ComboBox options={optionLists} val={sortBy} setVal={setSortBy} innerText="Filter" />
                </div>
              </div>
              <div className="relative flex flex-row w-1/6 p-2 justify-end">
                <Button className="w-full" onClick={onclickFilter}>Filter</Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="w-1/2 m-2">
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
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Indices ({filteredIndices.length})</CardTitle>
          <CardDescription>Overview of top N indices in your cluster</CardDescription>
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
