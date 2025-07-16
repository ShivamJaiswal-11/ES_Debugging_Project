"use client"

import axios from "axios"
import dayjs from "dayjs"
import Link from "next/link"
import type React from "react"
import toast from "react-hot-toast"
import { useRouter } from "next/navigation"
import { useState, useCallback, useEffect } from "react"
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { ArrowLeft, LineChart, RefreshCw, Search, ZoomIn, RotateCcw, RotateCw, Clock, Bot } from "lucide-react"
import { Line, LineChart as RechartsLineChart, ResponsiveContainer, XAxis, YAxis, CartesianGrid, ReferenceArea } from "recharts"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const availableMetrics = [
  {
    id: "docs_count",
    label: "Docs Count",
    lightColor: "rgb(220, 38, 127)",
    darkColor: "rgb(251, 146, 60)",
    scale: "primary",
  },
  {
    id: "index_total",
    label: "Indexing Total",
    lightColor: "rgb(37, 99, 235)",
    darkColor: "rgb(96, 165, 250)",
    scale: "secondary",
  },
  {
    id: "search_total",
    label: "Search Count",
    lightColor: "rgb(22, 163, 74)",
    darkColor: "rgb(74, 222, 128)",
    scale: "secondary",
  },
  {
    id: "refresh_total",
    label: "Refresh Count",
    lightColor: "rgb(202, 138, 4)",
    darkColor: "rgb(250, 204, 21)",
    scale: "secondary",
  },
  {
    id: "store_size",
    label: "Stored Size",
    lightColor: "rgb(147, 51, 234)",
    darkColor: "rgb(196, 181, 253)",
    scale: "primary",
  },
]

const getMetricColor = (metricId: string, isDark?: boolean) => {
  const metric = availableMetrics.find((m) => m.id === metricId)
  if (!metric) return "rgb(156, 163, 175)"


  if (isDark === undefined) {
    isDark = document.documentElement.classList.contains("dark")
  }

  return isDark ? metric.darkColor : metric.lightColor
}

const getSelectionColor = (isDark?: boolean) => {
  if (isDark === undefined) {
    isDark = document.documentElement.classList.contains("dark")
  }
  return isDark ? "rgb(96, 165, 250)" : "rgb(37, 99, 235)"
}


const formatTimestamp = (timestamp: number | string) => {
  let date: Date

  if (typeof timestamp === "string") {
    date = new Date(timestamp)
  } else {
    date = new Date(timestamp)
  }

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

interface SetterMap {
  [key: string]: React.Dispatch<React.SetStateAction<string>>
}

interface setExpr {
  [key: string]: string
}

export default function IndexMetricExplorer() {

  const router = useRouter()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [indexInput, setIndexInput] = useState("")
  const [showAddMetrics, setShowAddMetrics] = useState(false)
  const [topNIndices, setTopNIndices] = useState<string[]>([])
  const [currentMetrics, setCurrentMetrics] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState<SelectedIndex | null>(null)

  const now = dayjs()
  const oneHourAgo = dayjs().subtract(1, "hour")

  const [m1_strt_time, set_M1_Strt_Time] = useState<string>(oneHourAgo.valueOf().toString())
  const [m2_strt_time, set_M2_Strt_Time] = useState<string>(oneHourAgo.valueOf().toString())
  const [m3_strt_time, set_M3_Strt_Time] = useState<string>(oneHourAgo.valueOf().toString())
  const [m4_strt_time, set_M4_Strt_Time] = useState<string>(oneHourAgo.valueOf().toString())
  const [m5_strt_time, set_M5_Strt_Time] = useState<string>(oneHourAgo.valueOf().toString())

  const [m1_end_time, set_M1_End_Time] = useState<string>(now.valueOf().toString())
  const [m2_end_time, set_M2_End_Time] = useState<string>(now.valueOf().toString())
  const [m3_end_time, set_M3_End_Time] = useState<string>(now.valueOf().toString())
  const [m4_end_time, set_M4_End_Time] = useState<string>(now.valueOf().toString())
  const [m5_end_time, set_M5_End_Time] = useState<string>(now.valueOf().toString())

  const map_tr_st: setExpr =
  {
    "docs_count": m1_strt_time,
    "index_total": m2_strt_time,
    "search_total": m3_strt_time,
    "refresh_total": m4_strt_time,
    "store_size": m5_strt_time,
  }
  const map_tr_ed: setExpr =
  {
    "docs_count": m1_end_time,
    "index_total": m2_end_time,
    "search_total": m3_end_time,
    "refresh_total": m4_end_time,
    "store_size": m5_end_time,
  }
  const map_tr1: SetterMap =
  {
    "docs_count": set_M1_Strt_Time,
    "index_total": set_M2_Strt_Time,
    "search_total": set_M3_Strt_Time,
    "refresh_total": set_M4_Strt_Time,
    "store_size": set_M5_Strt_Time,
  }
  const map_tr2: SetterMap =
  {
    "docs_count": set_M1_End_Time,
    "index_total": set_M2_End_Time,
    "search_total": set_M3_End_Time,
    "refresh_total": set_M4_End_Time,
    "store_size": set_M5_End_Time,
  }


  useEffect(() => {
    const storedTopNIndices = localStorage.getItem("top_n_filtered_indices_list")
    const storedIndices = localStorage.getItem("indices_list")

    if (storedTopNIndices) {
      setTopNIndices(JSON.parse(storedTopNIndices))
    } else if (storedIndices) {
      setTopNIndices(JSON.parse(storedIndices))
    }

  }, [data])

  useEffect(() => {
    addIndexWithMetrics()
  }, [
    m1_strt_time, m2_strt_time, m3_strt_time, m4_strt_time, m5_strt_time,
    m1_end_time, m2_end_time, m3_end_time, m4_end_time, m5_end_time
  ])

  const handleIndexSelect = (indexName: string) => {
    if (indexName) {
      setIndexInput(indexName)
    }
  }

  const handleMetricToggle = (metricId: string) => {
    setCurrentMetrics((prev) => (prev.includes(metricId) ? prev.filter((id) => id !== metricId) : [...prev, metricId]))
  }

  const return_Expr = (metric_name: string) => {
    const expr_array: setExpr =
    {
      "docs_count": "avg(change_stream_num_documents_fetched{} )",
      "index_total": "sum(rate(jaeger_bulk_index_attempts_total{}[$__rate_interval]) )",
      "search_total": "avg(node_nf_conntrack_stat_search_restart{} )",
      "refresh_total": "sum(rate(node_nfs_rpc_authentication_refreshes_total{}[$__rate_interval]) )",
      "store_size": "avg(spr_grpc_executor_executor_pool_size_threads{} )"
    }
    return expr_array[metric_name]
  }

  const addIndexWithMetrics = async () => {

    if (currentMetrics.length === 0) return
    setLoading(true)

    try {
      const metricDataObjects: MetricData[] = await Promise.all(
        currentMetrics.map(async (metricId) => {
          const response = await axios.post("http://127.0.0.1:8000/query/metric", {
            "expr": return_Expr(metricId),
            "from_time": map_tr_st[metricId],
            "to_time": map_tr_ed[metricId],
            "metric_name": metricId
          })
          const originalData = response.data
          return {
            id: metricId,
            data: originalData,
            originalData: originalData,
            zoomState: {
              left: null,
              right: null,
              refAreaLeft: null,
              refAreaRight: null,
              isZooming: false,
            }
          }
        })
      )

      const newIndex: SelectedIndex = {
        name: indexInput,
        metrics: metricDataObjects,
      }

      setSelectedIndex(newIndex)
      setIndexInput("")
      setLoading(false)
    } catch (err) {
      toast.error("Unable to fetch data")
      setLoading(false)
    }
  }

  const changeIndex = () => {
    setSelectedIndex(null)
    setIndexInput("")
    setCurrentMetrics([])
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
            <Button variant="outline" onClick={changeIndex}>
              <RotateCw className="h-4 w-4 mr-2" />
              Change Index
            </Button>
          </div>
        )}
      </div>

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
                      {topNIndices.map((index: any) => (
                        <SelectItem key={index.name} value={index.name}>
                          {index.name}
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
        {selectedIndex?.metrics.map((metricData) => {
          return <MetricChart
            setTime1={map_tr1[metricData.id]}
            setTime2={map_tr2[metricData.id]}
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
  setTime1: React.Dispatch<React.SetStateAction<string>>
  setTime2: React.Dispatch<React.SetStateAction<string>>
  indexName: string
  metricData: MetricData
  onZoomStateChange: (metricId: string, zoomState: ZoomState) => void
  onDataChange: (metricId: string, data: any[]) => void
  onRemoveMetric: (metricId: string) => void
}


const MetricChart: React.FC<MetricChartProps> = ({
  setTime1,
  setTime2,
  indexName,
  metricData,
  onZoomStateChange,
  onDataChange,
  onRemoveMetric,
}) => {

  const now = dayjs()
  const oneHourAgo = dayjs().subtract(1, "hour")
  const [fromTime, setFromTime] = useState<dayjs.Dayjs | null>(oneHourAgo)
  const [toTime, setToTime] = useState<dayjs.Dayjs | null>(now)

  const values = metricData.data.map((d) => d[metricData.id])
  const min = Math.min(...values)
  const max = Math.max(...values)
  const padding = (max - min) * 0.1 || 0.01

  const applyTimeRange = () => {
    if (!fromTime || !toTime) {
      toast.error("Select time range!")
    }
    else {
      setTime1(fromTime.valueOf().toString())
      setTime2(toTime.valueOf().toString())
    }
  }

  const onClickink = () => {
    axios.post("http://127.0.0.1:8000/chat/init-ts-debug", { data: metricData.data })
      .then((response) => {
        toast.success(response.data.status)
      }).catch((err) => {
        toast.success("Unable to initiate chatbot ! ", err)
      })
  }

  const yDomain = [min - padding, max + padding]
  const getMetricLabel = (metricId: string) => {
    return availableMetrics.find((m) => m.id === metricId)?.label || metricId
  }

  const formatMetricValue = (value: number, metric: string): string => {
    if (metric === "stored_size") {
      return (value).toFixed(4) + " KB"
    } else {
      return (value).toFixed(4) + " K"
    }
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
        const left = Math.min(refAreaLeft, refAreaRight)
        const right = Math.max(refAreaLeft, refAreaRight)
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
        <div className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="h-5 w-5" />
              {indexName} - {getMetricLabel(metricData.id)}
            </CardTitle>
            <CardDescription>Metric: {getMetricLabel(metricData.id)}</CardDescription>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="flex flex-row gap-2">
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
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full max-w-4xl p-4 rounded-lg border bg-muted text-foreground">
          <div className="flex items-center mb-4">
            <Clock className="w-5 h-5 text-muted-foreground mr-2" />
            <span className="font-medium text-base">Absolute time range:</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start sm:gap-4 gap-2">
            <div className="w-full sm:w-1/3">
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateTimePicker
                  label="From"
                  ampm={false}
                  value={fromTime}
                  views={['year', 'month', 'day', 'hours', 'minutes', 'seconds']}
                  onChange={(newValue) => setFromTime(newValue)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: "small",
                      InputLabelProps: { className: "text-foreground" },
                      InputProps: {
                        className:
                          "bg-background text-foreground dark:bg-zinc-900 dark:text-white",
                      },
                    },
                  }}
                />
              </LocalizationProvider>
            </div>

            <div className="w-full sm:w-1/3">
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateTimePicker
                  label="To"
                  ampm={false}
                  value={toTime}
                  views={['year', 'month', 'day', 'hours', 'minutes', 'seconds']}
                  onChange={(newValue) => setToTime(newValue)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: "small",
                      InputLabelProps: { className: "text-foreground dar" },
                      InputProps: {
                        className:
                          "bg-background text-foreground dark:bg-zinc-900 dark:text-white",
                      },
                    },
                  }}
                />
              </LocalizationProvider>
            </div>

            <div className="sm:mt-0 mt-2">
              <button
                onClick={applyTimeRange}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition hover:cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
        <div className="m-4 flex items-center gap-2 text-sm text-muted-foreground">
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
              margin={{ top: 20, right: 150, left: 40, bottom: 60 }}
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
                domain={yDomain}
                tickFormatter={(value) => formatMetricValue(value, metricData.id)}
                tick={{
                  fontSize: 12,
                  pointerEvents: "none",
                  style: {
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    MozUserSelect: "none",
                    msUserSelect: "none",
                    pointerEvents: "none",
                  },
                }}
                width={120}
              />
              <ChartTooltip
                content={({ label, payload }) => {
                  return (
                    <div className="bg-white dark:bg-black p-2 rounded shadow text-sm">
                      <div><strong>Time:</strong> {formatTimestamp(Number(label))}</div>
                      {payload?.map((entry, i) => (
                        <div key={i}>
                          {entry.name}: {Number(entry.value).toFixed(3)}
                        </div>
                      ))}
                    </div>
                  )
                }}
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
      <div className="bottom-6 right-6 z-50 flex flex-col items-end space-y-2 pr-10 pb-10">
        <div className="relative bg-black dark:bg-white text-white dark:text-black text-sm px-3 py-1 rounded-full shadow-md animate-[float_3s_ease-in-out_infinite]">
          Ask Query
          <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-black dark:border-t-white" />
        </div>
        <Link
          href="/dashboard/chatbot?metric=true"
          onClick={onClickink} className="hover:cursor-pointer">
          <div
            className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-black dark:bg-blue-50 relative flex items-center justify-center hover:bg-zinc-800 hover:dark:bg-blue-100 mr-4"
          >
            <Bot className="text-blue-50 dark:text-black" size={30} />
            <span className="sr-only">Open Debugging Assistant</span>
          </div>
        </Link>
      </div>
    </Card>
  )
}
