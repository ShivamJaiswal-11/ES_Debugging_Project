"use client"

import type React from "react"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, LineChart, RefreshCw, Search, ZoomIn, RotateCcw, Plus, RotateCw } from "lucide-react"
import {
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ReferenceArea,
} from "recharts"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

// Available indices
const availableIndices = [
  "logs-2024.01",
  "users",
  "products",
  "orders-2024",
  "analytics",
  "sessions",
  "events-2024",
  "metrics",
  "audit-logs",
]

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

// Generate mock time-series data for an index
const generateMockData = (indexName: string, metrics: string[]) => {
  const now = new Date()
  const data = []

  for (let i = 0; i < 100; i++) {
    // 100 data points for better zoom demonstration
    const timestamp = new Date(now.getTime() - (99 - i) * 30 * 60 * 1000) // Every 30 minutes
    const entry: Record<string, any> = {
      timestamp: timestamp.getTime(), // Use timestamp for better zoom handling
      timestampStr: timestamp.toISOString(),
      hour: timestamp.getHours(),
      index: i,
    }

    metrics.forEach((metric) => {
      let baseValue = 0

      // Different base values for different metrics and indices
      switch (metric) {
        case "docs_count":
          baseValue =
            indexName === "logs-2024.01"
              ? 1250000
              : indexName === "users"
                ? 45000
                : indexName === "products"
                  ? 12000
                  : indexName === "orders-2024"
                    ? 890000
                    : indexName === "analytics"
                      ? 2100000
                      : indexName === "sessions"
                        ? 750000
                        : 500000
          break
        case "index_total":
          baseValue =
            indexName === "logs-2024.01"
              ? 25000
              : indexName === "users"
                ? 1500
                : indexName === "products"
                  ? 800
                  : indexName === "orders-2024"
                    ? 12000
                    : indexName === "analytics"
                      ? 18000
                      : 8000
          break
        case "search_total":
          baseValue =
            indexName === "logs-2024.01"
              ? 85000
              : indexName === "users"
                ? 120000
                : indexName === "products"
                  ? 180000
                  : indexName === "orders-2024"
                    ? 65000
                    : indexName === "analytics"
                      ? 95000
                      : 75000
          break
        case "refresh_total":
          baseValue =
            indexName === "logs-2024.01"
              ? 1200
              : indexName === "users"
                ? 300
                : indexName === "products"
                  ? 250
                  : indexName === "orders-2024"
                    ? 800
                    : indexName === "analytics"
                      ? 1500
                      : 600
          break
        case "store_size":
          baseValue =
            indexName === "logs-2024.01"
              ? 2100
              : indexName === "users"
                ? 125
                : indexName === "products"
                  ? 45
                  : indexName === "orders-2024"
                    ? 1800
                    : indexName === "analytics"
                      ? 3200
                      : 1000
          break
      }

      // Add realistic patterns and variations - ensure continuous data
      const hourlyPattern = Math.sin((entry.hour / 24) * 2 * Math.PI) * 0.15 + 1
      const dailyTrend = Math.sin((i / 48) * 2 * Math.PI) * 0.1 + 1 // 48 points per day cycle
      const randomVariation = (Math.random() - 0.5) * 0.05
      const overallTrend = (i / 100) * 0.1 // Slight upward trend

      entry[metric] = Math.round(baseValue * hourlyPattern * dailyTrend * (1 + randomVariation + overallTrend))
    })

    data.push(entry)
  }

  return data
}

// Format metric values for display
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
  const [addingMetrics, setAddingMetrics] = useState(false)
  const [showAddMetrics, setShowAddMetrics] = useState(false)

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
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Generate mock data for all metrics
      const originalData = generateMockData(indexInput, currentMetrics)

      // Create metric data objects
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
                      {availableIndices.map((index) => (
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
        {selectedIndex?.metrics.map((metricData) => (
          <MetricChart
            key={metricData.id}
            indexName={selectedIndex.name}
            metricData={metricData}
            onZoomStateChange={updateMetricZoomState}
            onDataChange={updateMetricData}
            onRemoveMetric={removeMetric}
          />
        ))}
      </div>
    </div>
  )
}

interface MetricChartProps {
  indexName: string
  metricData: MetricData
  onZoomStateChange: (metricId: string, zoomState: ZoomState) => void
  onDataChange: (metricId: string, data: any[]) => void
  onRemoveMetric: (metricId: string) => void
}

const MetricChart: React.FC<MetricChartProps> = ({
  indexName,
  metricData,
  onZoomStateChange,
  onDataChange,
  onRemoveMetric,
}) => {
  const getMetricLabel = (metricId: string) => {
    return availableMetrics.find((m) => m.id === metricId)?.label || metricId
  }

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
