"use client"

import { useState } from "react"
import { Plus, FileText, Search, MoreVertical, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"

export interface Document {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
}

interface DocumentListProps {
  documents: Document[]
  activeDocumentId: string | null
  onSelectDocument: (documentId: string) => void
  onCreateDocument: () => void
  onDeleteDocument: (documentId: string) => void
  onRenameDocument: (documentId: string, newTitle: string) => void
}

export default function DocumentList({
  documents,
  activeDocumentId,
  onSelectDocument,
  onCreateDocument,
  onDeleteDocument,
  onRenameDocument,
}: DocumentListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState("")

  const filteredDocuments = documents.filter((doc) => doc.title.toLowerCase().includes(searchQuery.toLowerCase()))

  const handleStartRename = (doc: Document) => {
    setRenamingId(doc.id)
    setNewTitle(doc.title)
  }

  const handleFinishRename = (id: string) => {
    if (newTitle.trim()) {
      onRenameDocument(id, newTitle.trim())
    }
    setRenamingId(null)
    setNewTitle("")
  }

  return (
    <div className="flex flex-col h-full">
      {/* Logo and App Title */}
      <div className="p-4 border-b bg-sidebar text-white">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-app-green" />
          <h1 className="text-xl font-bold text-white">AI PDF Generator</h1>
        </div>
        <p className="text-app-green/80 text-sm mt-1">Create documents with AI</p>
      </div>

      <div className="p-4 border-b">
        <Button onClick={onCreateDocument} className="w-full bg-app-green hover:bg-app-green/80 text-white">
          <Plus className="mr-2 h-4 w-4" />
          New Document
        </Button>
      </div>

      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {filteredDocuments.length > 0 ? (
            filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className={`p-3 rounded-md flex items-center justify-between cursor-pointer ${
                  activeDocumentId === doc.id
                    ? "bg-app-green/20 dark:bg-app-green/10 border-l-4 border-app-green"
                    : "hover:bg-muted"
                }`}
                onClick={() => onSelectDocument(doc.id)}
              >
                <div className="flex items-center overflow-hidden">
                  <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-app-green" />
                  {renamingId === doc.id ? (
                    <Input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onBlur={() => handleFinishRename(doc.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleFinishRename(doc.id)
                        if (e.key === "Escape") setRenamingId(null)
                      }}
                      className="h-7 py-1 px-2"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className="truncate">{doc.title}</div>
                  )}
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStartRename(doc)
                      }}
                    >
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDeleteDocument(doc.id)
                      }}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              {searchQuery ? "No documents found" : "No documents yet"}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
