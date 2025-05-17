"use client"

import { useState } from "react"
import { Plus, FileText, Search, MoreVertical, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import UserProfile from "@/components/user-profile"

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
  collapsed?: boolean
}

export default function DocumentList({
  documents,
  activeDocumentId,
  onSelectDocument,
  onCreateDocument,
  onDeleteDocument,
  onRenameDocument,
  collapsed = false,
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
      <div className="p-4 border-b bg-sidebar">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-sidebar-accent" />
          {!collapsed && <h1 className="text-xl font-bold text-sidebar-foreground">docfa.st</h1>}
        </div>
        {!collapsed && <p className="text-sidebar-accent text-sm mt-1">Create documents with AI</p>}
      </div>

      <div className="p-4 border-b bg-sidebar">
        <Button
          onClick={onCreateDocument}
          className={`${collapsed ? "w-8 p-0" : "w-full"} bg-gradient-green hover:opacity-90 text-white`}
        >
          <Plus className={`${collapsed ? "" : "mr-2"} h-4 w-4`} />
          {!collapsed && "New Document"}
        </Button>
      </div>

      {!collapsed && (
        <div className="p-4 border-b bg-sidebar">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search documents..."
              className="pl-8 bg-sidebar border-sidebar-accent/30 text-sidebar-foreground"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      <ScrollArea className="flex-1 bg-sidebar">
        <div className="p-4 space-y-2">
          {filteredDocuments.length > 0 ? (
            filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className={`p-3 rounded-md flex items-center justify-between cursor-pointer ${
                  activeDocumentId === doc.id
                    ? "bg-sidebar-accent/20 border-l-4 border-sidebar-accent"
                    : "hover:bg-sidebar/80"
                }`}
                onClick={() => onSelectDocument(doc.id)}
              >
                <div className="flex items-center overflow-hidden">
                  <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-sidebar-accent" />
                  {renamingId === doc.id ? (
                    <Input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      onBlur={() => handleFinishRename(doc.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleFinishRename(doc.id)
                        if (e.key === "Escape") setRenamingId(null)
                      }}
                      className="h-7 py-1 px-2 bg-sidebar border-sidebar-accent/30 text-sidebar-foreground"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className="truncate text-sidebar-foreground">
                      {collapsed
                        ? doc.title.charAt(0)
                        : doc.title.length > 20
                          ? `${doc.title.substring(0, 20)}...`
                          : doc.title}
                    </div>
                  )}
                </div>

                {!collapsed && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-sidebar-foreground hover:text-sidebar-accent"
                      >
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
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-sidebar-foreground/70">
              {searchQuery ? "No documents found" : "No documents yet"}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* User Profile */}
      <UserProfile collapsed={collapsed} />
    </div>
  )
}
