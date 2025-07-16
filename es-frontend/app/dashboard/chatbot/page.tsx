"use client"

import axios from "axios"
import type React from "react"
import { toast } from "react-hot-toast"
import { useSearchParams } from "next/navigation"
import { useState, useEffect, useRef } from "react"
import { Send, Bot, User, Loader2 } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import LoadingSpinner from "@/components/ui/loading-spinner"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

const suggestionQuestions1 = [
  "Can you identify any performance issues based on the current system state?",
  "Are there any threads or tasks that are using too many resources or running for too long?",
  "Does the JVM information suggest any memory or garbage collection problems?"
]

const suggestionQuestions2 = [
  "Do you notice any unusual spikes or drops in the index metrics over time?",
  "Are there any patterns indicating slow indexing or delayed query responses?",
  "Based on the metrics, is there any indication of resource bottlenecks (CPU, memory, I/O)?"
]

const suggestionQuestions3 = [
  "Are there any unassigned shards in the cluster?",
  "Is the search or indexing rate unusually low for any index?",
  "Are there any nodes consuming excessive heap memory?"
]

export default function DebuggingAssistant() {
  const searchParams = useSearchParams()
  const [suggQues, setSuggQues] = useState<string[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector("[data-radix-scroll-area-viewport]")
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const initStatus = localStorage.getItem("Chatbot-stats-init");
    const queryQuestion = searchParams.get("metric")
    const queryQuestion1 = searchParams.get("apitool")
    if (queryQuestion && queryQuestion == "false" && initStatus !== "true") {
      setMessages([])
      setSuggQues(suggestionQuestions1)
      init_Chatbot()
      localStorage.setItem("Chatbot-stats-init", "true")
    }
    else if (queryQuestion && queryQuestion == "true") {
      setMessages([])
      setSuggQues(suggestionQuestions2)
      localStorage.setItem("Chatbot-stats-init", "false")
      setLoading(false)
    }
    else if (queryQuestion1 && queryQuestion1 == "true") {
      setMessages([])
      setSuggQues(suggestionQuestions3);
      localStorage.setItem("Chatbot-stats-init", "false")
      setLoading(false)
    }
    else if(initStatus=="true")
    {
      setSuggQues(suggestionQuestions1)
    }
  }, [searchParams])

  const init_Chatbot=async()=>{
    const initStatus = localStorage.getItem("Chatbot-stats-init");
    const clusterName = localStorage.getItem("SelectedClusterName")
    setLoading(true)
    if(initStatus!="true"){
      await axios
      .get("http://127.0.0.1:8000/chat/init-stats-debug?cluster_name=" + clusterName)
      .then(async (res) => {
        toast.success(res.data.status)
        localStorage.setItem("Chatbot-stats-init", "true")
      })
      .catch((err) => {
        toast.error("Failed to initiate chatbot!", err)
        localStorage.setItem("Chatbot-stats-init", "false")
        setLoading(false)
      }).finally(() => {
        setLoading(false)
      })
    }
    setLoading(false)
  }
  const generateMessageId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9)
  }

  const addMessage = (role: "user" | "assistant", content: string) => {
    const newMessage: Message = {
      id: generateMessageId(),
      role,
      content,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, newMessage])
  }

  const handleSendMessage = async (message: string) => {
    const cluster_name = localStorage.getItem("SelectedClusterName")
    if (!message.trim() || isLoading) return
    const queryQuestion = searchParams.get("metric")
    if (!queryQuestion) {
      addMessage("user", message)
      setInputValue("")
      setIsLoading(true)
      axios
        .post("http://127.0.0.1:8000/chat/tool-query", { "message": message, "cluster_name": cluster_name })
        .then(async (res) => {
          console.log(res.data)
          addMessage(
            "assistant",
            res.data.reply
          )

        })
        .catch((err) => {
          toast.error("Failed to get response!", err)
          addMessage("assistant", "Unable to get response!")
        })
        .finally(() =>
          setIsLoading(false)
        )
    }
    else {
      addMessage("user", message)
      setInputValue("")
      setIsLoading(true)
      axios
        .post("http://127.0.0.1:8000/chat/send", { "message": message, "metric": queryQuestion })
        .then(async (res) => {
          addMessage(
            "assistant",
            res.data
          )

        })
        .catch((err) => {
          toast.error("Failed to get response!", err)
          addMessage("assistant", "Unable to get response!")
        })
        .finally(() =>
          setIsLoading(false)
        )
    }

  }

  const handleSuggestionClick = (question: string) => {
    handleSendMessage(question)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSendMessage(inputValue)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(inputValue)
    }
  }

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <>
      {loading ? (
        <div className="flex justify-center items-center min-h-[200px]">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto space-y-4">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">Debugging Assistant</h1>
            <p className="text-muted-foreground mt-2">Get help with your Elasticsearch issues and optimization questions</p>
          </div>
          {messages.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {suggQues.map((question, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="h-auto p-4 text-left whitespace-normal bg-transparent"
                      onClick={() => handleSuggestionClick(question)}
                      disabled={isLoading}
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          <Card className="flex-1 flex flex-col overflow-scroll">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Chat History
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col p-0 overflow-scroll">
              <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
                <div className="space-y-4 pb-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Start a conversation by asking a question or clicking one of the suggestions above.</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        {message.role === "assistant" && (
                          <Avatar className="h-8 w-8 mt-1">
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              <Bot className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}

                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-2 ${message.role === "user" ? "bg-primary text-primary-foreground ml-auto" : "bg-muted"
                            }`}
                        >
                          <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
                          <div
                            className={`text-xs mt-2 opacity-70 ${message.role === "user" ? "text-right" : "text-left"}`}
                          >
                            {formatTimestamp(message.timestamp)}
                          </div>
                        </div>

                        {message.role === "user" && (
                          <Avatar className="h-8 w-8 mt-1">
                            <AvatarFallback className="bg-secondary">
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))
                  )}
                  {isLoading && (
                    <div className="flex gap-3 justify-start">
                      <Avatar className="h-8 w-8 mt-1">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          <Bot className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="bg-muted rounded-lg px-4 py-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Assistant is thinking...
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="border-t p-4">
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask a question about your Elasticsearch cluster..."
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!inputValue.trim() || isLoading} size="icon">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    <span className="sr-only">Send message</span>
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>)}
    </>
  )
}
