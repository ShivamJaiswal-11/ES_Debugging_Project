"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { useState, useCallback, useEffect } from "react"
import { ArrowLeft, LineChart, RefreshCw, Search, ZoomIn, RotateCcw, Plus, RotateCw } from "lucide-react"
import { Line, LineChart as RechartsLineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Legend, ReferenceArea } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import axios from "axios"
import { set } from "react-hook-form"


// Available metrics with theme-aware RGB colors
const availableMetrics = [
  {
    id: "docs_count",
    label: "Document Count",
    lightColor: "rgb(220, 38, 127)", // Dark pink for light theme
    darkColor: "rgb(251, 146, 60)", // Light orange for dark theme
    scale: "primary",
  },
  {
    id: "index_total",
    label: "Index Operations",
    lightColor: "rgb(37, 99, 235)", // Dark blue for light theme
    darkColor: "rgb(96, 165, 250)", // Light blue for dark theme
    scale: "secondary",
  },
  {
    id: "search_total",
    label: "Search Operations",
    lightColor: "rgb(22, 163, 74)", // Dark green for light theme
    darkColor: "rgb(74, 222, 128)", // Light green for dark theme
    scale: "secondary",
  },
  {
    id: "refresh_total",
    label: "Refresh Operations",
    lightColor: "rgb(202, 138, 4)", // Dark yellow for light theme
    darkColor: "rgb(250, 204, 21)", // Light yellow for dark theme
    scale: "secondary",
  },
  {
    id: "store_size",
    label: "Storage Size",
    lightColor: "rgb(147, 51, 234)", // Dark purple for light theme
    darkColor: "rgb(196, 181, 253)", // Light purple for dark theme
    scale: "primary",
  },
]

// Theme-aware color helper
const getMetricColor = (metricId: string, isDark?: boolean) => {
  const metric = availableMetrics.find((m) => m.id === metricId)
  if (!metric) return "rgb(156, 163, 175)" // Default gray

  // Detect theme from document if not provided
  if (isDark === undefined) {
    isDark = document.documentElement.classList.contains("dark")
  }

  return isDark ? metric.darkColor : metric.lightColor
}

// Get selection area color based on theme
const getSelectionColor = (isDark?: boolean) => {
  if (isDark === undefined) {
    isDark = document.documentElement.classList.contains("dark")
  }
  return isDark ? "rgb(96, 165, 250)" : "rgb(37, 99, 235)" // Light blue for dark, dark blue for light
}


const formatMetricValue = (value: number, metric: string) => {
  if (metric === "store_size") {
    return value > 1000 ? `${(value / 1000).toFixed(1)}GB` : `${value}MB`
  }
  if (value > 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value > 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toString()
}

// Format timestamp for display - handle both number and string inputs
const formatTimestamp = (timestamp: number | string) => {
  let date: Date

  if (typeof timestamp === "string") {
    date = new Date(timestamp)
  } else {
    date = new Date(timestamp)
  }

  // Check if date is valid
  if (isNaN(date.getTime())) {
    return "Invalid Date"
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

interface ZoomState {
  left: number | null
  right: number | null
  refAreaLeft: number | null
  refAreaRight: number | null
  isZooming: boolean
}

interface MetricData {
  id: string
  data: any[]
  originalData: any[]
  zoomState: ZoomState
}

interface SelectedIndex {
  name: string
  metrics: MetricData[]
}

export default function IndexMetricExplorer() {
  const router = useRouter()
  const [indexInput, setIndexInput] = useState("")
  const [selectedIndex, setSelectedIndex] = useState<SelectedIndex | null>(null)
  const [currentMetrics, setCurrentMetrics] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [addingMetrics, setAddingMetrics] = useState(false)
  const [showAddMetrics, setShowAddMetrics] = useState(false)
  const [topNIndices, setTopNIndices] = useState<string[]>([])

  const generateMockData = (indexName: string, metrics: string[]) => {
  const now = new Date()
  const data = [{"docs_count" : 465010,"hour" : 14,"index" : 0,"timestamp" :1751187374566,"timestampStr" : "2025-06-29T08:56:14.566Z"}]
 
  axios.post("http://127.0.0.1:8000/query/metric", {
    "expr": "sum(rate(node_nfs_rpc_authentication_refreshes_total{}[$__rate_interval]))",
    "from_time": "1751359995000",
    "to_time": "1751360621301"
    }).then((response) => {
      console.log("Data fetched successfully:", response.data)
      // setData(response.data)
      // Process the data as needed
      setData(response.data)
      return response.data
    }).catch((error) => {
      console.error("Error fetching data:", error)
    })
    // .finally(() => {
    //   return data
    // })
    return data
}
  
  const extractData =async(indexName: string, metrics: string[])=>
  {
    await axios.post("http://127.0.0.1:8000/query/metric", {
    "expr": "sum(rate(node_nfs_rpc_authentication_refreshes_total{}[$__rate_interval]))",
    "from_time": "1751359995000",
    "to_time": "1751360621301"
    }).then((response) => {
      // console.log("Data fetched successfully:", response.data)
      setData(response.data)
      // Process the data as needed
    }).catch((error) => {
      console.error("Error fetching data:", error)
    })
    .finally(() => {
      return data
    })
  }
  useEffect(() => { 
    // Load top N indices from localStorage or use default
    const storedTopNIndices = localStorage.getItem("top_n_indices_list")
    const storedIndices = localStorage.getItem("indices_list") 

    if (storedTopNIndices) {
      setTopNIndices(JSON.parse(storedTopNIndices))
    } else if(storedIndices){
      setTopNIndices(JSON.parse(storedIndices))
    }
    
  }, [data])

  const handleIndexSelect = (indexName: string) => {
    if (indexName) {
      setIndexInput(indexName)
    }
  }

  const handleMetricToggle = (metricId: string) => {
    setCurrentMetrics((prev) => (prev.includes(metricId) ? prev.filter((id) => id !== metricId) : [...prev, metricId]))
  }

  const addIndexWithMetrics = async () => {
    if (!indexInput.trim() || currentMetrics.length === 0) return
    
    setLoading(true)
    try {
      // Simulate API call
      // await new Promise((resolve) => setTimeout(resolve, 1000))
      // Fetch data from API
      const org_data=localStorage.getItem("extracted_data___")
      if(!org_data){
        axios.post("http://127.0.0.1:8000/query/metric", {
        "expr": "sum(rate(node_nfs_rpc_authentication_refreshes_total{}[$__rate_interval]))",
        "from_time": "1751359995000",
        "to_time": "1751360621301"
        }).then((response) => {
          // console.log("Data fetched successfully:", response.data)
          setData(response.data)
          // const originalData = generateMockData(indexInput, currentMetrics)
          const originalData = response.data
          localStorage.setItem("extracted_data_", JSON.stringify(response.data))
          localStorage.setItem("extracted_data__", JSON.stringify(originalData))
          const metricDataObjects: MetricData[] = currentMetrics.map((metricId) => ({
          id: metricId,
          data: originalData,
          originalData: originalData,
          zoomState: {
            left: null,
            right: null,
            refAreaLeft: null,
            refAreaRight: null,
            isZooming: false,
          },
        }))

        const newIndex: SelectedIndex = {
          name: indexInput,
          metrics: metricDataObjects,
        }

        setSelectedIndex(newIndex)
        setIndexInput("")
        setCurrentMetrics([])
        setAddingMetrics(false)
        console.log("Index and metrics added successfully:", newIndex)
          // Process the data as needed
        }).catch((error) => {
          console.error("Error fetching data:", error)
        })
      }
      else{

        console.log("Using existing data from localStorage",JSON.parse(org_data))
      // Create metric data objects
      const metricDataObjects: MetricData[] = currentMetrics.map((metricId) => ({
        id: metricId,
        data: JSON.parse(org_data),
        originalData:  JSON.parse(org_data),
        zoomState: {
          left: null,
          right: null,
          refAreaLeft: null,
          refAreaRight: null,
          isZooming: false,
        },
      }))

      const newIndex: SelectedIndex = {
        name: indexInput,
        metrics: metricDataObjects,
      }

      setSelectedIndex(newIndex)
      setIndexInput("")
      setCurrentMetrics([])
      setAddingMetrics(false)
      }
    } catch (error) {
      console.error("Failed to fetch metrics:", error)
    } finally {
      setLoading(false)
    }
  }

  const addMoreMetrics = async () => {
    if (!selectedIndex || currentMetrics.length === 0) return

    setLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Generate mock data for new metrics only
      const originalData = generateMockData(selectedIndex.name, currentMetrics)

      // Create new metric data objects
      const newMetricDataObjects: MetricData[] = currentMetrics.map((metricId) => ({
        id: metricId,
        data: originalData,
        originalData: originalData,
        zoomState: {
          left: null,
          right: null,
          refAreaLeft: null,
          refAreaRight: null,
          isZooming: false,
        },
      }))

      // Add new metrics to existing index
      setSelectedIndex((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          metrics: [...prev.metrics, ...newMetricDataObjects],
        }
      })

      setCurrentMetrics([])
      setShowAddMetrics(false)
    } catch (error) {
      console.error("Failed to add metrics:", error)
    } finally {
      setLoading(false)
    }
  }

  const changeIndex = () => {
    setSelectedIndex(null)
    setIndexInput("")
    setCurrentMetrics([])
    setAddingMetrics(false)
    setShowAddMetrics(false)
  }

  const updateMetricZoomState = (metricId: string, zoomState: ZoomState) => {
    setSelectedIndex((prev) => {
      if (!prev) return prev

      return {
        ...prev,
        metrics: prev.metrics.map((metric) => (metric.id === metricId ? { ...metric, zoomState } : metric)),
      }
    })
  }

  const updateMetricData = (metricId: string, data: any[]) => {
    setSelectedIndex((prev) => {
      if (!prev) return prev

      return {
        ...prev,
        metrics: prev.metrics.map((metric) => (metric.id === metricId ? { ...metric, data } : metric)),
      }
    })
  }

  const removeMetric = (metricId: string) => {
    setSelectedIndex((prev) => {
      if (!prev) return prev

      return {
        ...prev,
        metrics: prev.metrics.filter((metric) => metric.id !== metricId),
      }
    })
  }

  const getMetricLabel = (metricId: string) => {
    return availableMetrics.find((m) => m.id === metricId)?.label || metricId
  }

  // Get metrics that are not currently active
  const getAvailableMetrics = () => {
    if (!selectedIndex) return availableMetrics
    const activeMetricIds = selectedIndex.metrics.map((m) => m.id)
    console.log("from getAvailable metrics",selectedIndex)
    return availableMetrics.filter((metric) => !activeMetricIds.includes(metric.id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/top-indices")} className="mr-2">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Index Metric Explorer</h1>
            <p className="text-muted-foreground">Visualize historical trends with click-and-drag zoom functionality</p>
          </div>
        </div>
        {selectedIndex && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowAddMetrics(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Metrics
            </Button>
            <Button variant="outline" onClick={changeIndex}>
              <RotateCw className="h-4 w-4 mr-2" />
              Change Index
            </Button>
          </div>
        )}
      </div>

      {/* Initial Index & Metrics Selection */}
      {!selectedIndex && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Select Index & Metrics
            </CardTitle>
            <CardDescription>Choose an index and select metrics to start visualizing</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="index-select">Index Name</Label>
                  <Select value={indexInput} onValueChange={handleIndexSelect}>
                    <SelectTrigger id="index-select">
                      <SelectValue placeholder="Select an index..." />
                    </SelectTrigger>
                    <SelectContent>
                      {topNIndices.map((index) => (
                        <SelectItem key={index} value={index}>
                          {index}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Custom Index Name</Label>
                  <Input
                    placeholder="Or type custom index name..."
                    value={indexInput}
                    onChange={(e) => setIndexInput(e.target.value)}
                  />
                </div>
              </div>

              {indexInput && (
                <div className="space-y-3">
                  <Label>Select Metrics for "{indexInput}"</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {availableMetrics.map((metric) => (
                      <div key={metric.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`metric-${metric.id}`}
                          checked={currentMetrics.includes(metric.id)}
                          onCheckedChange={() => handleMetricToggle(metric.id)}
                        />
                        <label
                          htmlFor={`metric-${metric.id}`}
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          {metric.label}
                        </label>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={addIndexWithMetrics}
                    disabled={currentMetrics.length === 0 || loading}
                    className="w-full sm:w-auto"
                  >
                    {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? "Loading..." : "Start Visualization"}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add More Metrics Modal */}
      {showAddMetrics && selectedIndex && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add More Metrics to "{selectedIndex.name}"
            </CardTitle>
            <CardDescription>Select additional metrics to add to your current visualization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-3">
                <Label>Available Metrics</Label>
                {getAvailableMetrics().length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      All available metrics are already being visualized for this index.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {getAvailableMetrics().map((metric) => (
                      <div key={metric.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`add-metric-${metric.id}`}
                          checked={currentMetrics.includes(metric.id)}
                          onCheckedChange={() => handleMetricToggle(metric.id)}
                        />
                        <label
                          htmlFor={`add-metric-${metric.id}`}
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          {metric.label}
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={addMoreMetrics}
                    disabled={currentMetrics.length === 0 || loading || getAvailableMetrics().length === 0}
                  >
                    {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? "Adding..." : "Add Selected Metrics"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddMetrics(false)
                      setCurrentMetrics([])
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Visualization Info */}
      {selectedIndex && !showAddMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              Current Visualization: {selectedIndex.name}
            </CardTitle>
            <CardDescription>
              Showing {selectedIndex.metrics.length} metric{selectedIndex.metrics.length !== 1 ? "s" : ""}:{" "}
              {selectedIndex.metrics.map((m) => getMetricLabel(m.id)).join(", ")}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {!selectedIndex && (
        <Alert>
          <AlertDescription>Select an index and choose metrics to start visualizing data.</AlertDescription>
        </Alert>
      )}

      {selectedIndex && selectedIndex.metrics.length === 0 && (
        <Alert>
          <AlertDescription>
            No metrics selected. Use the "Add Metrics" button to add some metrics to visualize.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {selectedIndex?.metrics.map((metricData)=>  {
          return<MetricChart
            sel_Id={selectedIndex}
            key={metricData.id}
            indexName={selectedIndex.name}
            metricData={metricData}
            onZoomStateChange={updateMetricZoomState}
            onDataChange={updateMetricData}
            onRemoveMetric={removeMetric}
          />
})}
      </div>
    </div>
  )
}

interface MetricChartProps {
  sel_Id:SelectedIndex
  indexName: string
  metricData: MetricData
  onZoomStateChange: (metricId: string, zoomState: ZoomState) => void
  onDataChange: (metricId: string, data: any[]) => void
  onRemoveMetric: (metricId: string) => void
}

const MetricChart: React.FC<MetricChartProps> = ({
  sel_Id,
  indexName,
  metricData,
  onZoomStateChange,
  onDataChange,
  onRemoveMetric,
}) => {
  const getMetricLabel = (metricId: string) => {
    return availableMetrics.find((m) => m.id === metricId)?.label || metricId
  }
  console.log("MetricChart rendered for metric:", metricData)
  console.log("SELID rendered for metric:", sel_Id)
  useEffect(() => {
    console.log("metricData updated:", metricData)
  }, [sel_Id])

  const handleMouseDown = useCallback(
    (e: any) => {
      if (e && e.activeLabel) {
        onZoomStateChange(metricData.id, {
          ...metricData.zoomState,
          refAreaLeft: e.activeLabel,
          refAreaRight: e.activeLabel,
          isZooming: true,
        })
      }
    },
    [metricData.id, metricData.zoomState, onZoomStateChange],
  )

  const handleMouseMove = useCallback(
    (e: any) => {
      if (metricData.zoomState.isZooming && e && e.activeLabel) {
        onZoomStateChange(metricData.id, {
          ...metricData.zoomState,
          refAreaRight: e.activeLabel,
        })
      }
    },
    [metricData.id, metricData.zoomState, onZoomStateChange],
  )

  const handleMouseUp = useCallback(() => {
    if (metricData.zoomState.isZooming) {
      const { refAreaLeft, refAreaRight } = metricData.zoomState

      if (refAreaLeft && refAreaRight && refAreaLeft !== refAreaRight) {
        // Zoom in
        const left = Math.min(refAreaLeft, refAreaRight)
        const right = Math.max(refAreaLeft, refAreaRight)

        // Filter data to zoom range
        const zoomedData = metricData.originalData.filter((item) => item.timestamp >= left && item.timestamp <= right)

        onDataChange(metricData.id, zoomedData.length > 0 ? zoomedData : metricData.originalData)
        onZoomStateChange(metricData.id, {
          left,
          right,
          refAreaLeft: null,
          refAreaRight: null,
          isZooming: false,
        })
        return
      }

      onZoomStateChange(metricData.id, {
        ...metricData.zoomState,
        refAreaLeft: null,
        refAreaRight: null,
        isZooming: false,
      })
    }
  }, [metricData.id, metricData.originalData, metricData.zoomState, onDataChange, onZoomStateChange])

  const resetZoom = useCallback(() => {
    onDataChange(metricData.id, metricData.originalData)
    onZoomStateChange(metricData.id, {
      left: null,
      right: null,
      refAreaLeft: null,
      refAreaRight: null,
      isZooming: false,
    })
  }, [metricData.id, metricData.originalData, onDataChange, onZoomStateChange])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              {indexName} - {getMetricLabel(metricData.id)}
            </CardTitle>
            <CardDescription>Metric: {getMetricLabel(metricData.id)}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <Badge
                variant="outline"
                style={{
                  borderColor: getMetricColor(metricData.id),
                  color: getMetricColor(metricData.id),
                }}
              >
                {getMetricLabel(metricData.id)}
              </Badge>
            </div>
            {(metricData.zoomState.left || metricData.zoomState.right) && (
              <Button variant="outline" size="sm" onClick={resetZoom}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset Zoom
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => onRemoveMetric(metricData.id)}>
              Remove
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <ZoomIn className="h-4 w-4" />
          Click and drag on the chart to select an area to zoom into
        </div>

        <ChartContainer
          config={{
            [metricData.id]: {
              label: getMetricLabel(metricData.id),
              color: getMetricColor(metricData.id),
            },
          }}
          className="h-[500px] relative"
          style={{
            userSelect: "none",
            WebkitUserSelect: "none",
            MozUserSelect: "none",
            msUserSelect: "none",
          }}
        >
          
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart
              data={metricData.data}
              margin={{ top: 20, right: 150, left: 40, bottom: 60 }} // Increased right margin for legend
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              style={{
                userSelect: "none",
                WebkitUserSelect: "none",
                MozUserSelect: "none",
                msUserSelect: "none",
              }}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tickFormatter={formatTimestamp}
                tick={{
                  fontSize: 12,
                  // userSelect: "none",
                  pointerEvents: "none",
                  style: {
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    MozUserSelect: "none",
                    msUserSelect: "none",
                    pointerEvents: "none",
                  },
                }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tickFormatter={(value) => formatMetricValue(value, "default")}
                tick={{
                  fontSize: 12,
                  // userSelect: "none",
                  pointerEvents: "none",
                  style: {
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    MozUserSelect: "none",
                    msUserSelect: "none",
                    pointerEvents: "none",
                  },
                }}
                width={60}
              />
              <ChartTooltip
                content={<ChartTooltipContent />}
                labelFormatter={(label) => {
                  const formatted = formatTimestamp(label as number)
                  return `Time: ${formatted}`
                }}
              />
              <Legend
                verticalAlign="middle"
                align="right"
                layout="vertical"
                iconType="line"
                wrapperStyle={{ paddingLeft: "20px" }}
              />

              <Line
                type="linear"
                dataKey={metricData.id}
                stroke={getMetricColor(metricData.id)}
                strokeWidth={2}
                dot={{ r: 2, fill: getMetricColor(metricData.id) }}
                activeDot={{ r: 4, strokeWidth: 2, fill: getMetricColor(metricData.id) }}
                name={getMetricLabel(metricData.id)}
                connectNulls={true}
                isAnimationActive={false}
              />

              {/* Reference area for zoom selection with theme-aware color */}
              {metricData.zoomState.refAreaLeft && metricData.zoomState.refAreaRight && (
                <ReferenceArea
                  x1={metricData.zoomState.refAreaLeft}
                  x2={metricData.zoomState.refAreaRight}
                  strokeOpacity={0.5}
                  fillOpacity={0.1}
                  fill={getSelectionColor()}
                  stroke={getSelectionColor()}
                />
              )}

          {/* Transparent overlays to prevent text selection on axes */}
          <div
            className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none z-10"
            style={{
              background: "transparent",
              userSelect: "none",
              WebkitUserSelect: "none",
              MozUserSelect: "none",
              msUserSelect: "none",
            }}
            />
          <div
            className="absolute top-0 bottom-0 left-0 w-16 pointer-events-none z-10"
            style={{
              background: "transparent",
              userSelect: "none",
              WebkitUserSelect: "none",
              MozUserSelect: "none",
              msUserSelect: "none",
            }}
            />
            </RechartsLineChart>
                    </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
