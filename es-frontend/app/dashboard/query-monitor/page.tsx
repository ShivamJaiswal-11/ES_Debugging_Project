"use client"

import { useState, useEffect } from "react"
import { Search, ChevronDown, ChevronRight, Clock, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Badge } from "@/components/ui/badge"
import axios from "axios"
import { ComboBox } from "@/components/combo-box"

interface QueryPhase {
  name: string
  time: string
  details: string[]
  inefficiencies?: string[]
  children?: QueryPhase[]
}

interface QueryResult {
  indexName: string
  totalTime: string
  phases: QueryPhase[]
}

interface Option {
  value: string
  label: string
}

export default function QueryMonitor() {
  const [indexName, setIndexName] = useState("")
  const [indicesList, setIndicesList] = useState<string[]>([])
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [openPhases, setOpenPhases] = useState<Set<string>>(new Set())
  const [optionList,setOptionList] = useState<Option[]>([])


  useEffect(() => {
    axios
    .get<string[]>("http://127.0.0.1:8000/indices")
    .then((response) => {
      setIndicesList(response.data)
      setOptionList(response.data.map((index) => ({ value: index, label: index })))
    })
    .catch((error) => {
      console.error("Failed to fetch indices:", error)
    }
    )
  }, [])

  const runQueryMonitor = async () => {
    if (!indexName.trim()) return

    setLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const mockResult: QueryResult = {
        indexName,
        totalTime: "45.2ms",
        phases: [
          {
            name: "Search Phase",
            time: "32.1ms",
            details: ["Query parsing: 2.1ms", "Index selection: 1.2ms", "Shard coordination: 28.8ms"],
            inefficiencies: ["High shard coordination time"],
            children: [
              {
                name: "Query Execution",
                time: "25.4ms",
                details: ["Term queries: 15.2ms", "Boolean logic: 10.2ms"],
              },
              {
                name: "Score Calculation",
                time: "3.4ms",
                details: ["TF-IDF scoring: 3.4ms"],
                inefficiencies: ["Missing scorer optimization"],
              },
            ],
          },
          {
            name: "Fetch Phase",
            time: "13.1ms",
            details: ["Document retrieval: 8.5ms", "Field extraction: 4.6ms"],
            children: [
              {
                name: "Stored Fields",
                time: "5.2ms",
                details: ["Field loading: 5.2ms"],
              },
              {
                name: "Fetch Source",
                time: "3.3ms",
                details: ["Source parsing: 3.3ms"],
              },
            ],
          },
        ],
      }

      setQueryResult(mockResult)
    } catch (error) {
      console.error("Failed to run query monitor:", error)
    } finally {
      setLoading(false)
    }
  }

  const togglePhase = (phaseName: string) => {
    const newOpenPhases = new Set(openPhases)
    if (newOpenPhases.has(phaseName)) {
      newOpenPhases.delete(phaseName)
    } else {
      newOpenPhases.add(phaseName)
    }
    setOpenPhases(newOpenPhases)
  }

  const renderPhase = (phase: QueryPhase, level = 0) => {
    const isOpen = openPhases.has(phase.name)
    const hasChildren = phase.children && phase.children.length > 0

    return (
      <div key={phase.name} className={`${level > 0 ? "ml-6 border-l pl-4" : ""}`}>
        <Collapsible open={isOpen} onOpenChange={() => togglePhase(phase.name)}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg cursor-pointer">
              <div className="flex items-center space-x-3">
                {hasChildren && (isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />)}
                <div>
                  <h4 className="font-medium">{phase.name}</h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      <Clock className="mr-1 h-3 w-3" />
                      {phase.time}
                    </Badge>
                    {phase.inefficiencies && phase.inefficiencies.length > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertCircle className="mr-1 h-3 w-3" />
                        Issues Found
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="ml-6 space-y-2">
              {phase.details.map((detail, idx) => (
                <p key={idx} className="text-sm text-muted-foreground">
                  • {detail}
                </p>
              ))}
              {phase.inefficiencies && phase.inefficiencies.length > 0 && (
                <div className="mt-3 p-3 bg-destructive/10 rounded-lg">
                  <h5 className="font-medium text-destructive mb-2">Inefficiencies Detected:</h5>
                  {phase.inefficiencies.map((issue, idx) => (
                    <p key={idx} className="text-sm text-destructive">
                      ⚠ {issue}
                    </p>
                  ))}
                </div>
              )}
              {phase.children && phase.children.map((child) => renderPhase(child, level + 1))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Query Monitor</h1>
        <p className="text-muted-foreground">Analyze query performance and identify bottlenecks</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Run Query Analysis</CardTitle>
          <CardDescription>Enter an index name to monitor query performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <ComboBox options={optionList} val={indexName} setVal={setIndexName} innerText="Index Name" width="300px" />
            {/* <Input
              placeholder="Enter index name..."
              value={indexName}
              onChange={(e) => setIndexName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && runQueryMonitor()}
            /> */}
            <Button onClick={runQueryMonitor} disabled={loading || !indexName.trim()}>
              <Search className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Analyze
            </Button>
          </div>
        </CardContent>
      </Card>

      {queryResult && (
        <Card>
          <CardHeader>
            <CardTitle>Query Analysis Results</CardTitle>
            <CardDescription>Performance breakdown for index: {queryResult.indexName}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Total Query Time</h3>
                <Badge variant="outline" className="text-lg">
                  <Clock className="mr-1 h-4 w-4" />
                  {queryResult.totalTime}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">{queryResult.phases.map((phase) => renderPhase(phase))}</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
