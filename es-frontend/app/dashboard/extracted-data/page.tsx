"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, LineChart, RefreshCw, Search, ZoomIn, RotateCcw } from "lucide-react"
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

// Available metrics with colors and scales
const availableMetrics = [
  {
    id: "docs_count",
    label: "Document Count",
    color: "hsl(var(--chart-1))",
    scale: "primary",
  },
  {
    id: "index_total",
    label: "Index Operations",
    color: "hsl(var(--chart-2))",
    scale: "secondary",
  },
  {
    id: "search_total",
    label: "Search Operations",
    color: "hsl(var(--chart-3))",
    scale: "secondary",
  },
  {
    id: "refresh_total",
    label: "Refresh Operations",
    color: "hsl(var(--chart-4))",
    scale: "secondary",
  },
  {
    id: "store_size",
    label: "Storage Size",
    color: "hsl(var(--chart-5))",
    scale: "primary",
  },
]

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
      const randomVariation = (0.7 - 0.5) * 0.05
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

// Format timestamp for display
const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

interface SelectedIndex {
  name: string
  metrics: string[]
  data: any[]
  originalData: any[]
  zoomState: {
    left: number | null
    right: number | null
    refAreaLeft: number | null
    refAreaRight: number | null
    isZooming: boolean
  }
}
// export const dynamic = 'force-dynamic'
export default function IndexMetricExplorer() {
  
  const router = useRouter()
  const [indexInput, setIndexInput] = useState("")
  const [selectedIndices, setSelectedIndices] = useState<SelectedIndex[]>([])
  const [currentMetrics, setCurrentMetrics] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const handleIndexSelect = (indexName: string) => {
    if (indexName && !selectedIndices.find((idx) => idx.name === indexName)) {
      setIndexInput(indexName)
      setCurrentMetrics([])
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

      // Generate mock data
      const originalData = generateMockData(indexInput, currentMetrics)

      const newIndex: SelectedIndex = {
        name: indexInput,
        metrics: [...currentMetrics],
        data: originalData,
        originalData: originalData,
        zoomState: {
          left: null,
          right: null,
          refAreaLeft: null,
          refAreaRight: null,
          isZooming: false,
        },
      }

      setSelectedIndices((prev) => [...prev, newIndex])
      setIndexInput("")
      setCurrentMetrics([])
    } catch (error) {
      console.error("Failed to fetch metrics:", error)
    } finally {
      setLoading(false)
    }
  }

  const removeIndex = (indexName: string) => {
    setSelectedIndices((prev) => prev.filter((idx) => idx.name !== indexName))
  }

  // Zoom functionality
  const handleMouseDown = useCallback((indexName: string, e: any) => {
    if (e && e.activeLabel) {
      setSelectedIndices((prev) =>
        prev.map((idx) =>
          idx.name === indexName
            ? {
                ...idx,
                zoomState: {
                  ...idx.zoomState,
                  refAreaLeft: e.activeLabel,
                  refAreaRight: e.activeLabel,
                  isZooming: true,
                },
              }
            : idx,
        ),
      )
    }
  }, [])

  const handleMouseMove = useCallback((indexName: string, e: any) => {
    setSelectedIndices((prev) =>
      prev.map((idx) => {
        if (idx.name === indexName && idx.zoomState.isZooming && e && e.activeLabel) {
          return {
            ...idx,
            zoomState: {
              ...idx.zoomState,
              refAreaRight: e.activeLabel,
            },
          }
        }
        return idx
      }),
    )
  }, [])

  const handleMouseUp = useCallback((indexName: string) => {
    setSelectedIndices((prev) =>
      prev.map((idx) => {
        if (idx.name === indexName && idx.zoomState.isZooming) {
          const { refAreaLeft, refAreaRight } = idx.zoomState

          if (refAreaLeft && refAreaRight && refAreaLeft !== refAreaRight) {
            // Zoom in
            const left = Math.min(refAreaLeft, refAreaRight)
            const right = Math.max(refAreaLeft, refAreaRight)

            // Filter data to zoom range
            const zoomedData = idx.originalData.filter((item) => item.timestamp >= left && item.timestamp <= right)

            return {
              ...idx,
              data: zoomedData.length > 0 ? zoomedData : idx.originalData,
              zoomState: {
                left,
                right,
                refAreaLeft: null,
                refAreaRight: null,
                isZooming: false,
              },
            }
          }

          return {
            ...idx,
            zoomState: {
              ...idx.zoomState,
              refAreaLeft: null,
              refAreaRight: null,
              isZooming: false,
            },
          }
        }
        return idx
      }),
    )
  }, [])

  const resetZoom = useCallback((indexName: string) => {
    setSelectedIndices((prev) =>
      prev.map((idx) =>
        idx.name === indexName
          ? {
              ...idx,
              data: idx.originalData,
              zoomState: {
                left: null,
                right: null,
                refAreaLeft: null,
                refAreaRight: null,
                isZooming: false,
              },
            }
          : idx,
      ),
    )
  }, [])

  const getMetricLabel = (metricId: string) => {
    return availableMetrics.find((m) => m.id === metricId)?.label || metricId
  }

  const getMetricColor = (metricId: string) => {
    return availableMetrics.find((m) => m.id === metricId)?.color || "hsl(var(--chart-1))"
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Add Index & Metrics
          </CardTitle>
          <CardDescription>Select an index and choose metrics to visualize</CardDescription>
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
                    {availableIndices
                      .filter((idx) => !selectedIndices.find((selected) => selected.name === idx))
                      .map((index) => (
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
                  {loading ? "Loading..." : "Add Index with Metrics"}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedIndices.length === 0 && (
        <Alert>
          <AlertDescription>Select an index and choose metrics to start visualizing data.</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {selectedIndices.map((indexData) => (
          <Card key={indexData.name}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-5 w-5" />
                    {indexData.name}
                  </CardTitle>
                  <CardDescription>Metrics: {indexData.metrics.map(getMetricLabel).join(", ")}</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {indexData.metrics.map((metric) => (
                      <Badge key={metric} variant="outline" style={{ borderColor: getMetricColor(metric) }}>
                        {getMetricLabel(metric)}
                      </Badge>
                    ))}
                  </div>
                  {(indexData.zoomState.left || indexData.zoomState.right) && (
                    <Button variant="outline" size="sm" onClick={() => resetZoom(indexData.name)}>
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Reset Zoom
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => removeIndex(indexData.name)}>
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
                config={indexData.metrics.reduce(
                  (acc, metric) => {
                    acc[metric] = {
                      label: getMetricLabel(metric),
                      color: getMetricColor(metric),
                    }
                    return acc
                  },
                  {} as Record<string, { label: string; color: string }>,
                )}
                className="h-[500px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart
                    data={indexData.data}
                    margin={{ top: 20, right: 30, left: 40, bottom: 60 }}
                    onMouseDown={(e) => handleMouseDown(indexData.name, e)}
                    onMouseMove={(e) => handleMouseMove(indexData.name, e)}
                    onMouseUp={() => handleMouseUp(indexData.name)}
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
                      tickFormatter={(value) => formatMetricValue(value, "default")}
                      tick={{ fontSize: 12 }}
                      width={60}
                    />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      labelFormatter={(value) => `Time: ${formatTimestamp(value as number)}`}
                    />
                    <Legend />

                    {indexData.metrics.map((metric) => (
                      <Line
                        key={metric}
                        type="linear" // Ensures straight lines between points
                        dataKey={metric}
                        stroke={getMetricColor(metric)}
                        strokeWidth={2}
                        dot={{ r: 2 }} // Small dots to show data points
                        activeDot={{ r: 4, strokeWidth: 2 }}
                        name={getMetricLabel(metric)}
                        connectNulls={true} // Connect all points even if some are null
                        isAnimationActive={false} // Disable animation for better zoom performance
                      />
                    ))}

                    {/* Reference area for zoom selection */}
                    {indexData.zoomState.refAreaLeft && indexData.zoomState.refAreaRight && (
                      <ReferenceArea
                        x1={indexData.zoomState.refAreaLeft}
                        x2={indexData.zoomState.refAreaRight}
                        strokeOpacity={0.3}
                        fillOpacity={0.1}
                        fill="hsl(var(--primary))"
                        stroke="hsl(var(--primary))"
                      />
                    )}
                  </RechartsLineChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
