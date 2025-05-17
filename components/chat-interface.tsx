"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Loader2, Send, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface ChatInterfaceProps {
  onGenerateDocument: (prompt: string) => Promise<void>
  isGenerating: boolean
  onUpdateDocument: (instruction: string) => Promise<void>
  documentVersions: number
  currentVersion: number
}

export default function ChatInterface({
  onGenerateDocument,
  isGenerating,
  onUpdateDocument,
  documentVersions,
  currentVersion,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I'm your AI document assistant. Describe the document you need, and I'll generate it for you. You can also ask me to update specific parts of the document after it's generated.",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isSubmitting) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsSubmitting(true)

    try {
      // If we already have a document, this is an update request
      if (documentVersions > 0) {
        await onUpdateDocument(input)

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `I've updated the document based on your request: "${input}". This is now version ${currentVersion + 1} of your document.`,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])
      } else {
        // This is a new document generation
        await onGenerateDocument(input)

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            "I've generated the document based on your description. You can now view and edit it in the document panel. Feel free to ask me to make specific changes.",
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])
      }
    } catch (error) {
      console.error("Error processing request:", error)

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, there was an error processing your request. Please try again.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-app-mint">
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-4 p-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`flex items-start gap-3 max-w-[80%]`}>
                  {message.role === "assistant" && (
                    <Avatar className="h-8 w-8 bg-sidebar text-app-green">
                      <Sparkles className="h-4 w-4" />
                    </Avatar>
                  )}
                  <Card className={`p-3 ${message.role === "user" ? "bg-app-green text-white" : "bg-white"}`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <div
                      className={`text-xs ${message.role === "user" ? "text-white/70" : "text-muted-foreground"} mt-1`}
                    >
                      {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </Card>
                  {message.role === "user" && (
                    <Avatar className="h-8 w-8">
                      <div className="bg-muted text-muted-foreground rounded-full h-full w-full flex items-center justify-center text-sm font-semibold">
                        U
                      </div>
                    </Avatar>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      <div className="p-4 border-t bg-white">
        <form onSubmit={handleSubmit} className="flex flex-col space-y-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              documentVersions > 0
                ? "Describe how you'd like to update the document..."
                : "Describe the document you need..."
            }
            className="min-h-[80px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
          />
          <Button
            type="submit"
            disabled={isSubmitting || isGenerating}
            className="self-end bg-app-green hover:bg-app-green/80 text-white"
          >
            {isSubmitting || isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isGenerating ? "Generating..." : "Sending..."}
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {documentVersions > 0 ? "Update Document" : "Generate Document"}
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
