"use client"

import { useState } from "react"
import { Plus, FileText, Search, MoreVertical, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import UserProfile from "@/components/user-profile"
import { useAuth } from "@/context/auth-context"
import { createDocument, updateDocumentTitle, deleteDocument } from "@/lib/document-storage"

export interface Document {
  id: string
  title: string
  created_at: string
  updated_at: string
}

interface DocumentListProps {
  documents: Document[]
  activeDocumentId: string | null
  onSelectDocument: (documentId: string) => void
  onCreateDocument: () => void
  onDeleteDocument: (documentId: string) => void
  onRenameDocument: (documentId: string, newTitle: string) => void
  collapsed?: boolean
  sidebarOpen: boolean
  toggleSidebar: () => void
}

export default function DocumentList({
  documents,
  activeDocumentId,
  onSelectDocument,
  onCreateDocument,
  onDeleteDocument,
  onRenameDocument,
  collapsed = false,
  sidebarOpen,
  toggleSidebar,
}: DocumentListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState("")
  const { user } = useAuth()

  const filteredDocuments = documents.filter((doc) => doc.title.toLowerCase().includes(searchQuery.toLowerCase()))

  const handleStartRename = (doc: Document) => {
    setRenamingId(doc.id)
    setNewTitle(doc.title)
  }

  const handleFinishRename = async (id: string) => {
    if (newTitle.trim() && user) {
      try {
        await updateDocumentTitle(id, newTitle.trim())
        onRenameDocument(id, newTitle.trim())
      } catch (error) {
        console.error("Error renaming document:", error)
      }
    }
    setRenamingId(null)
    setNewTitle("")
  }

  const handleCreateDoc = async () => {
    if (user) {
      try {
        const newDoc = await createDocument(user.id, `New Document ${documents.length + 1}`)
        onCreateDocument()
      } catch (error) {
        console.error("Error creating document:", error)
      }
    } else {
      onCreateDocument()
    }
  }

  const handleDeleteDoc = async (id: string) => {
    if (user) {
      try {
        await deleteDocument(id)
        onDeleteDocument(id)
      } catch (error) {
        console.error("Error deleting document:", error)
      }
    } else {
      onDeleteDocument(id)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* New Document Button */}
      <div className="p-4 flex items-center justify-between border-b bg-sidebar">
        <div className="flex items-center gap-2 overflow-hidden">
          <FileText className="h-5 w-5 text-sidebar-accent flex-shrink-0" />
          {sidebarOpen && (
            <div className="overflow-hidden">
              <h1 className="text-xl font-bold text-sidebar-foreground truncate">WriteDoc</h1>
              <p className="text-sidebar-accent text-xs">Create documents with AI</p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="text-sidebar-foreground ml-2 flex-shrink-0"
        >
          {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>
      <div className="p-4 border-b bg-sidebar">
        <Button
          onClick={handleCreateDoc}
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
                className={`p-2 rounded-md flex items-center justify-between cursor-pointer ${
                  activeDocumentId === doc.id
                    ? "bg-sidebar-accent/20 border-l-4 border-sidebar-accent"
                    : "hover:bg-sidebar/80"
                }`}
                onClick={() => onSelectDocument(doc.id)}
              >
                <div className="flex items-center overflow-hidden">
                  <FileText className="h-4 w-4 mr-1 flex-shrink-0 text-sidebar-accent" />
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
                    <div className="truncate text-sidebar-foreground max-w-[120px]">
                      {collapsed
                        ? doc.title.charAt(0)
                        : doc.title.length > 18
                          ? `${doc.title.substring(0, 18)}...`
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
                        className="h-6 w-6 p-0 text-sidebar-foreground hover:text-sidebar-accent"
                      >
                        <MoreVertical className="h-3 w-3" />
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
                          handleDeleteDoc(doc.id)
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
