"use client"

import axios from "axios"
import toast from "react-hot-toast"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, RefreshCw, Folder, Hash, HardDrive, Activity } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ComboBox } from "@/components/combo-box"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface IndexInfo {
  name: string
  docCount: number
  indexingCount: number
  searchCount: number
  refreshCount: number
  size: string
  health: "green" | "yellow" | "red"
}

interface IndexInfo_ {
  index: string
  docs_count: number
  store_size: number
  indexing_index_total: number
  search_query_total: number
  refresh_refresh_total: number
  health: "green" | "yellow" | "red"

}

const optionLists = [
  {
    value: "docs_count",
    label: "Docs Count"
  },
  {
    value: "store_size",
    label: "Stored Size"
  },
  {
    value: "indexing_index_total",
    label: "Indexing Count"
  },
  {
    value: "refresh_refresh_total",
    label: "Refresh Count"
  },
  {
    value: "search_query_total",
    label: "Search Count"
  },
]
export default function TopIndices() {
  const router = useRouter()
  const [n_val, setN_val] = useState("0")
  const [sortBy, setSortBy] = useState("")
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [fdisabled, setFdisabled] = useState(false)
  const [indices, setIndices] = useState<IndexInfo[]>([])
  const [filteredIndices, setFilteredIndices] = useState<IndexInfo[]>([])

  const fetchIndices = async () => {
    const clusterName = localStorage.getItem("SelectedClusterName")
    setLoading(true)
    axios
    .get<IndexInfo_[]>(`http://127.0.0.1:8000/get-top-indices?cluster_name=${clusterName}&top_n=${n_val}&sort_by=${sortBy}`)
    .then((res) => {
      const indexNames = res.data
      const indexInfoResponses = (indexNames.map((index) => {
        const info: IndexInfo = {
          name: index.index,
          docCount: index.docs_count,
          size: `${index.store_size} bytes`,
          health: index.health,
          indexingCount: index.indexing_index_total,
          searchCount: index.search_query_total,
          refreshCount: index.refresh_refresh_total
        }
        return info
      }))
      const validInfo = indexInfoResponses.filter(
        (info): info is IndexInfo => info !== null
      )
      setIndices(validInfo)
      localStorage.setItem("top_n_filtered_indices_list", JSON.stringify(validInfo));
      toast.success("Indices fetched successfully!")
    })
    .catch((err) => {
      toast.error("Error fetching indices list. Please try again later.",err)
    })
    .finally(() => {
      setTimeout(() => {
        setLoading(false)
      }, 100)
    }
    )
  }

  useEffect(() => {
    const clusterInit = localStorage.getItem("ClusterInit")
    if (clusterInit !== "true") {
      router.push("/")
    }
    else {
      const stored_n_val = localStorage.getItem("N_val")
      const stored_sortBy = localStorage.getItem("SortBy")
      if (stored_n_val) {
        setN_val(stored_n_val)
      }
      if (stored_sortBy) {
        setSortBy(stored_sortBy)
      }
      const filtered_indices_lst = localStorage.getItem("top_n_filtered_indices_list")
      if (filtered_indices_lst) {
        const parsedIndices = JSON.parse(filtered_indices_lst) as IndexInfo[]
        if (parsedIndices.length > 0) {
          setIndices(parsedIndices)
        }
      } else {
        fetchIndices()
      }
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
  const onclickFilter = () => {
    setFdisabled(true)
    let n_val_num = 1;
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
    const clusterName = localStorage.getItem("SelectedClusterName")
    axios
      .get<IndexInfo_[]>(`http://127.0.0.1:8000/get-top-indices?cluster_name=${clusterName}&top_n=${n_val}&sort_by=${sortBy}`)
      .then((res) => {
        const indexNames = res.data
        const indexInfoResponses = (indexNames.map((index) => {
          const info: IndexInfo = {
            name: index.index,
            docCount: index.docs_count,
            size: `${index.store_size} bytes`,
            health: index.health,
            indexingCount: index.indexing_index_total,
            searchCount: index.search_query_total,
            refreshCount: index.refresh_refresh_total
          }
          return info
        }
        )
        )
        const validInfo = indexInfoResponses.filter(
          (info): info is IndexInfo => info !== null
        )
        setIndices(validInfo)
        localStorage.setItem("top_n_filtered_indices_list", JSON.stringify(validInfo));
        toast.success("Indices fetched successfully!")
      })
      .catch((err) => {
        toast.error("Error fetching indices list. Please try again later.",err)
      })
      .finally(() => {
        setTimeout(() => {
          setFdisabled(false)
        }, 100)
      }
      )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Top N Indices</h1>
          <p className="text-muted-foreground">Filter your Top N Elasticsearch indices</p>
        </div>
        <Button onClick={fetchIndices} disabled={loading} className="hover:cursor-pointer">
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
      <div className="flex flex-row w-full">
        <Card className="w-1/2 m-2">
          <CardHeader>
            <CardTitle>Top N Index Filter</CardTitle>
            <CardDescription>Filter and Sort indices by different metrics to find most active indices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative flex flex-row">
              <div className="relative flex flex-row w-5/6 p-2 h-full">
                <Input
                  type="number"
                  placeholder="Enter value of N"
                  value={n_val}
                  onChange={(e) => setN_val((e.target.value))}
                  className="mr-8 w-3/5 h-full justify-center flex text-black dark:text-white dark:placeholder:text-gray-300 placeholder:text-zinc-800"
                />
                <div className="ml-4 w-2/3">
                  <ComboBox options={optionLists} val={sortBy} setVal={setSortBy} innerText="Filter" />
                </div>
              </div>
              <div className="relative flex flex-row w-1/6 p-2 justify-end">
                <Button className="w-full hover:cursor-pointer" onClick={onclickFilter} disabled={fdisabled}>Filter</Button>
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
          <div className="flex flex-row items-center justify-between">
            <div className="flex flex-col">
              <CardTitle>Indices ({filteredIndices.length})</CardTitle>
              <CardDescription>Overview of top N indices in your cluster</CardDescription>
            </div>
            <div>
              <Button className="hover:cursor-pointer" onClick={() => router.push("/dashboard/extracted-data")}>
                Extract Time Series Data
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><div className="flex flex-row space-x-2 items-center justify-start"><Folder /> <div>Index Name </div></div></TableHead>
                <TableHead><div className="flex flex-row space-x-2 items-center justify-start"><Hash /> <div>Docs Count </div></div></TableHead>
                <TableHead><div className="flex flex-row space-x-2 items-center justify-start"><Hash /> <div>Indexing Count </div></div></TableHead>
                <TableHead><div className="flex flex-row space-x-2 items-center justify-start"><Hash /> <div>Search Count </div></div></TableHead>
                <TableHead><div className="flex flex-row space-x-2 items-center justify-start"><Hash /> <div>Refresh Count </div></div></TableHead>
                <TableHead><div className="flex flex-row space-x-2 items-center justify-start"><HardDrive /> <div>Stored Size </div></div></TableHead>
                <TableHead><div className="flex flex-row space-x-2 items-center justify-start"><Activity /> <div>Health </div></div></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIndices.map((index) => (
                <TableRow key={index.name}>
                  <TableCell className="font-medium">{index.name}</TableCell>
                  <TableCell>{index.docCount.toLocaleString()}</TableCell>
                  <TableCell>{index.indexingCount.toLocaleString()}</TableCell>
                  <TableCell>{index.searchCount.toLocaleString()}</TableCell>
                  <TableCell>{index.refreshCount.toLocaleString()}</TableCell>
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
