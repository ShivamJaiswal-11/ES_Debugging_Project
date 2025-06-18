"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, LineChart, RefreshCw, Search, ZoomIn, RotateCcw, Plus } from "lucide-react"
import {
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
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
    unit: "docs",
  },
  {
    id: "index_total",
    label: "Index Operations",
    lightColor: "rgb(37, 99, 235)", // Dark blue for light theme
    darkColor: "rgb(96, 165, 250)", // Light blue for dark theme
    scale: "secondary",
    unit: "ops/sec",
  },
  {
    id: "search_total",
    label: "Search Operations",
    lightColor: "rgb(22, 163, 74)", // Dark green for light theme
    darkColor: "rgb(74, 222, 128)", // Light green for dark theme
    scale: "secondary",
    unit: "ops/sec",
  },
  {
    id: "refresh_total",
    label: "Refresh Operations",
    lightColor: "rgb(202, 138, 4)", // Dark yellow for light theme
    darkColor: "rgb(250, 204, 21)", // Light yellow for dark theme
    scale: "secondary",
    unit: "ops/sec",
  },
  {
    id: "store_size",
    label: "Storage Size",
    lightColor: "rgb(147, 51, 234)", // Dark purple for light theme
    darkColor: "rgb(196, 181, 253)", // Light purple for dark theme
    scale: "primary",
    unit: "MB",
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
  const metricInfo = availableMetrics.find((m) => m.id === metric)

  if (metric === "store_size") {
    return value > 1000 ? `${(value / 1000).toFixed(1)}GB` : `${value}MB`
  }
  if (value > 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value > 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return `${value}${metricInfo?.unit ? ` ${metricInfo.unit}` : ""}`
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

interface MetricZoomState {
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
  zoomState: MetricZoomState
}

interface SelectedIndex {
  name: string
  metrics: MetricData[]
}

// Individual Metric Chart Component
interface MetricChartProps {
  indexName: string
  metricData: MetricData
  onZoomStateChange: (metricId: string, newState: MetricZoomState) => void
  onDataChange: (metricId: string, newData: any[]) => void
  onRemoveMetric: (metricId: string) => void
}

function MetricChart({ indexName, metricData, onZoomStateChange, onDataChange, onRemoveMetric }: MetricChartProps) {
  const metricInfo = availableMetrics.find((m) => m.id === metricData.id)
  const metricColor = getMetricColor(metricData.id)

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
      } else {
        onZoomStateChange(metricData.id, {
          ...metricData.zoomState,
          refAreaLeft: null,
          refAreaRight: null,
          isZooming: false,
        })
      }
    }
  }, [metricData, onDataChange, onZoomStateChange])

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
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: metricColor }} />
            <div>
              <CardTitle className="text-lg">{metricInfo?.label || metricData.id}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                <span>Index: {indexName}</span>
                <Badge variant="outline" className="text-xs">
                  {metricInfo?.unit || "value"}
                </Badge>
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(metricData.zoomState.left || metricData.zoomState.right) && (
              <Button variant="ghost" size="sm" onClick={resetZoom}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset Zoom
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => onRemoveMetric(metricData.id)}>
              Remove
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <ZoomIn className="h-4 w-4" />
          Click and drag on the chart to select an area to zoom into
        </div>

        <ChartContainer
          config={{
            [metricData.id]: {
              label: metricInfo?.label || metricData.id,
              color: metricColor,
            },
          }}
          className="h-[300px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart
              data={metricData.data}
              margin={{ top: 20, right: 20, left: 60, bottom: 60 }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis
                dataKey="timestamp"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                tickFormatter={formatTimestamp}
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tickFormatter={(value) => formatMetricValue(value, metricData.id)}
                tick={{ fontSize: 12 }}
                width={60}
              />
              <ChartTooltip
                content={<ChartTooltipContent />}
                labelFormatter={(value) => {
                  const formatted = formatTimestamp(value as number)
                  return `Time: ${formatted}`
                }}
                formatter={(value: any) => [
                  formatMetricValue(value, metricData.id),
                  metricInfo?.label || metricData.id,
                ]}
              />

              <Line
                type="linear"
                dataKey={metricData.id}
                stroke={metricColor}
                strokeWidth={2}
                dot={{ r: 2, fill: metricColor }}
                activeDot={{ r: 4, strokeWidth: 2, fill: metricColor }}
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
            </RechartsLineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default function IndexMetricExplorer() {
  const router = useRouter()
  const [indexInput, setIndexInput] = useState("")
  const [selectedIndex, setSelectedIndex] = useState<SelectedIndex | null>(null)
  const [currentMetrics, setCurrentMetrics] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [addingMetrics, setAddingMetrics] = useState(false)

  const handleIndexSelect = (indexName: string) => {
    if (indexName) {
      setIndexInput(indexName)
      setCurrentMetrics([])
    }
  }

  const handleMetricToggle = (metricId: string) => {
    setCurrentMetrics((prev) => (prev.includes(metricId) ? prev.filter((id) => id !== metricId) : [...prev, metricId]))
  }

  const createIndexWithMetrics = async () => {
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

      // Generate mock data for new metrics
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
      setSelectedIndex({
        ...selectedIndex,
        metrics: [...selectedIndex.metrics, ...newMetricDataObjects],
      })

      setCurrentMetrics([])
      setAddingMetrics(false)
    } catch (error) {
      console.error("Failed to fetch metrics:", error)
    } finally {
      setLoading(false)
    }
  }

  const removeIndex = () => {
    setSelectedIndex(null)
    setIndexInput("")
    setCurrentMetrics([])
    setAddingMetrics(false)
  }

  const removeMetric = (metricId: string) => {
    if (!selectedIndex) return

    const updatedMetrics = selectedIndex.metrics.filter((m) => m.id !== metricId)

    if (updatedMetrics.length === 0) {
      // If no metrics left, remove the entire index
      removeIndex()
    } else {
      setSelectedIndex({
        ...selectedIndex,
        metrics: updatedMetrics,
      })
    }
  }

  const updateMetricZoomState = (metricId: string, newState: MetricZoomState) => {
    if (!selectedIndex) return

    setSelectedIndex({
      ...selectedIndex,
      metrics: selectedIndex.metrics.map((metric) =>
        metric.id === metricId ? { ...metric, zoomState: newState } : metric,
      ),
    })
  }

  const updateMetricData = (metricId: string, newData: any[]) => {
    if (!selectedIndex) return

    setSelectedIndex({
      ...selectedIndex,
      metrics: selectedIndex.metrics.map((metric) => (metric.id === metricId ? { ...metric, data: newData } : metric)),
    })
  }

  const getAvailableMetrics = () => {
    if (!selectedIndex) return availableMetrics

    const usedMetricIds = selectedIndex.metrics.map((m) => m.id)
    return availableMetrics.filter((metric) => !usedMetricIds.includes(metric.id))
  }

  const getMetricLabel = (metricId: string) => {
    return availableMetrics.find((m) => m.id === metricId)?.label || metricId
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
            <p className="text-muted-foreground">
              Select one index and visualize each metric in separate cards with individual zoom controls
            </p>
          </div>
        </div>
      </div>

      {!selectedIndex ? (
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
                    onClick={createIndexWithMetrics}
                    disabled={currentMetrics.length === 0 || loading}
                    className="w-full sm:w-auto"
                  >
                    {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? "Loading..." : "Create Visualization"}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  {selectedIndex.name}
                </CardTitle>
                <CardDescription>
                  {selectedIndex.metrics.length} metric{selectedIndex.metrics.length !== 1 ? "s" : ""} selected
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {getAvailableMetrics().length > 0 && (
                  <Button variant="outline" onClick={() => setAddingMetrics(!addingMetrics)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Metrics
                  </Button>
                )}
                <Button variant="outline" onClick={removeIndex}>
                  Change Index
                </Button>
              </div>
            </div>
          </CardHeader>
          {addingMetrics && getAvailableMetrics().length > 0 && (
            <CardContent className="border-t">
              <div className="space-y-3">
                <Label>Add More Metrics to "{selectedIndex.name}"</Label>
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

                <div className="flex gap-2">
                  <Button onClick={addMoreMetrics} disabled={currentMetrics.length === 0 || loading} size="sm">
                    {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? "Adding..." : "Add Selected Metrics"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setAddingMetrics(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
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
