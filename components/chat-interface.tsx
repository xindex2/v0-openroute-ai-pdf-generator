"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Loader2, Send, Sparkles, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// Add a function to save messages to localStorage
const saveMessagesToLocalStorage = (messages: Message[], documentId: string | null) => {
  if (!documentId) return
  try {
    localStorage.setItem(`chat_history_${documentId}`, JSON.stringify(messages))
  } catch (error) {
    console.error("Error saving chat history to localStorage:", error)
  }
}

// Add a function to load messages from localStorage
const loadMessagesFromLocalStorage = (documentId: string | null): Message[] => {
  if (!documentId) return []
  try {
    const savedMessages = localStorage.getItem(`chat_history_${documentId}`)
    if (savedMessages) {
      const parsedMessages = JSON.parse(savedMessages)
      // Convert string dates back to Date objects
      return parsedMessages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }))
    }
  } catch (error) {
    console.error("Error loading chat history from localStorage:", error)
  }
  return []
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

// Update the ChatInterface component to include documentId prop
interface ChatInterfaceProps {
  onGenerateDocument: (prompt: string) => Promise<void>
  isGenerating: boolean
  onUpdateDocument: (instruction: string) => Promise<void>
  documentVersions: number
  currentVersion: number
  documentId: string | null
  urlPrompt?: string | null
  hasProcessedUrlPrompt?: boolean
  setHasProcessedUrlPrompt?: (value: boolean) => void
}

// Update the function signature to include documentId
export default function ChatInterface({
  onGenerateDocument,
  isGenerating,
  onUpdateDocument,
  documentVersions,
  currentVersion,
  documentId,
  urlPrompt,
  hasProcessedUrlPrompt,
  setHasProcessedUrlPrompt,
}: ChatInterfaceProps) {
  // Load initial messages from localStorage based on documentId
  const [messages, setMessages] = useState<Message[]>(() => {
    const savedMessages = loadMessagesFromLocalStorage(documentId)
    if (savedMessages.length > 0) {
      return savedMessages
    }
    return [
      {
        id: "welcome",
        role: "assistant",
        content:
          "Hello! I'm your AI document assistant. Describe the document you need, and I'll generate it for you. You can also ask me to update specific parts of the document after it's generated.",
        timestamp: new Date(),
      },
    ]
  })
  const [input, setInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Add these state variables and refs
  const [isTyping, setIsTyping] = useState(false)
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const typingIndexRef = useRef(0)

  // Add this effect to handle URL prompt typing animation
  useEffect(() => {
    if (urlPrompt && !hasProcessedUrlPrompt && setHasProcessedUrlPrompt) {
      // Start typing animation
      setIsTyping(true)
      typingIndexRef.current = 0

      const typePrompt = () => {
        if (typingIndexRef.current <= urlPrompt.length) {
          setInput(urlPrompt.substring(0, typingIndexRef.current))
          typingIndexRef.current += 1

          // Continue typing
          typingIntervalRef.current = setTimeout(typePrompt, 50)
        } else {
          // Finished typing
          setIsTyping(false)
          setHasProcessedUrlPrompt(true)

          // Auto-submit after a short delay if configured
          // Uncomment this if you want auto-submission
          // setTimeout(() => {
          //   handleSubmit(new Event('submit') as React.FormEvent)
          // }, 1000)
        }
      }

      // Start the typing animation
      typingIntervalRef.current = setTimeout(typePrompt, 500)

      return () => {
        if (typingIntervalRef.current) {
          clearTimeout(typingIntervalRef.current)
        }
      }
    }
  }, [urlPrompt, hasProcessedUrlPrompt, setHasProcessedUrlPrompt])

  // Add effect to save messages when they change or documentId changes
  useEffect(() => {
    if (documentId) {
      saveMessagesToLocalStorage(messages, documentId)
    }
  }, [messages, documentId])

  // Add effect to load messages when documentId changes
  useEffect(() => {
    if (documentId) {
      const savedMessages = loadMessagesFromLocalStorage(documentId)
      if (savedMessages.length > 0) {
        setMessages(savedMessages)
      } else {
        // Reset to welcome message if no saved messages for this document
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content:
              "Hello! I'm your AI document assistant. Describe the document you need, and I'll generate it for you. You can also ask me to update specific parts of the document after it's generated.",
            timestamp: new Date(),
          },
        ])
      }
    }
  }, [documentId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleShare = () => {
    if (!input.trim()) return

    // Create a URL-friendly version of the prompt
    const urlPrompt = encodeURIComponent(input.trim())

    // Create the shareable URL
    const shareUrl = `${window.location.origin}/?prompt=${urlPrompt}`

    // Copy to clipboard
    navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        // Show a toast or alert
        alert("Shareable link copied to clipboard!")
      })
      .catch((err) => {
        console.error("Failed to copy URL: ", err)
      })
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
    <div className="flex flex-col h-full bg-mint">
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-4 p-4">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`flex items-start gap-3 max-w-[80%]`}>
                  {message.role === "assistant" && (
                    <Avatar className="h-8 w-8 bg-sidebar text-todo-green">
                      <Sparkles className="h-4 w-4" />
                    </Avatar>
                  )}
                  <Card className={`p-3 ${message.role === "user" ? "bg-gradient-green text-white" : "bg-white"}`}>
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
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleShare}
                    disabled={!input.trim() || isSubmitting || isGenerating || isTyping}
                    className="bg-white"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Share this prompt</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              type="submit"
              disabled={isSubmitting || isGenerating || isTyping}
              className="bg-gradient-green hover:opacity-90 text-white"
            >
              {isSubmitting || isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isGenerating ? "Generating..." : "Sending..."}
                </>
              ) : isTyping ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Typing...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {documentVersions > 0 ? "Update Document" : "Generate Document"}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
