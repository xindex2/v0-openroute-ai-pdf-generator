"\"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Loader2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/contexts/auth-context"
import { AuthModal } from "@/components/auth/auth-modal"

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
  documentId: string | null
  urlPrompt?: string | null
  hasProcessedUrlPrompt?: boolean
  setHasProcessedUrlPrompt?: (value: boolean) => void
}

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
  const [prompt, setPrompt] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (urlPrompt && !hasProcessedUrlPrompt) {
      setPrompt(urlPrompt)
      setHasProcessedUrlPrompt(true)
    }
  }, [urlPrompt, hasProcessedUrlPrompt, setHasProcessedUrlPrompt])

  useEffect(() => {
    // Load messages from localStorage when documentId changes
    const savedMessages = loadMessagesFromLocalStorage(documentId)
    setMessages(savedMessages)
  }, [documentId])

  useEffect(() => {
    // Save messages to localStorage whenever messages or documentId changes
    saveMessagesToLocalStorage(messages, documentId)
  }, [messages, documentId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || isGenerating) return

    if (!user) {
      // Save the prompt and show login modal
      setPendingPrompt(prompt)
      setIsAuthModalOpen(true)
      return
    }

    // Add user message to the chat
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: prompt,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])

    // Generate document and add assistant message
    try {
      await onGenerateDocument(prompt)
    } finally {
      setPrompt("")
    }
  }

  const handleUpdate = async (instruction: string) => {
    if (!user) {
      setIsAuthModalOpen(true)
      return
    }

    // Add user message to the chat
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: instruction,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])

    // Update document and add assistant message
    try {
      await onUpdateDocument(instruction)
    } finally {
      setPrompt("")
    }
  }

  const handleAuthSuccess = () => {
    // Process the pending prompt after successful authentication
    if (pendingPrompt) {
      handleSubmit({ preventDefault: () => {} } as any)
      setPendingPrompt(null)
    }
  }

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = "auto"
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [prompt])

  // Scroll to bottom of chat on new messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

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

  return (
    <div className="flex flex-col h-full">
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`mb-2 p-3 rounded-md ${
              message.role === "user" ? "bg-gray-100 text-gray-800" : "bg-todo-green/10 text-gray-800"
            }`}
          >
            <p className="text-sm font-medium">{message.role === "user" ? "You" : "Assistant"}</p>
            <p className="text-sm">{message.content}</p>
          </div>
        ))}
      </div>

      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleTextareaKeyDown}
            placeholder="Type your prompt here..."
            className="flex-1 min-h-[60px] max-h-[200px] resize-none"
            disabled={isGenerating}
          />
          <Button
            type="submit"
            size="icon"
            className="h-[60px] w-[60px] rounded-full bg-gradient-green text-white"
            disabled={!prompt.trim() || isGenerating}
          >
            {isGenerating ? <Loader2 className="h-6 w-6 animate-spin" /> : <Send className="h-6 w-6" />}
          </Button>
        </form>
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onSuccess={handleAuthSuccess} />
    </div>
  )
}
