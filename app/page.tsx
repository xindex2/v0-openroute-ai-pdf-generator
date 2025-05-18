"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Suspense } from "react"
import { FileText, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { streamDocument, updateDocument } from "@/lib/document-actions"
import ChatInterface from "@/components/chat-interface"
import EditableDocumentPreview from "@/components/editable-document-preview"
import DocumentActions from "@/components/document-actions"
import VersionHistory from "@/components/version-history"
import DocumentList, { type Document } from "@/components/document-list"
// Update imports to include the new export functions
import {
  generatePdf,
  generatePdfWithCanvas,
  generateImage,
  generateHtml,
  generateTextDocument,
  printDocument,
} from "@/lib/simplified-export"
// Update the import for supabaseClient
import { useSupabase } from "@/app/supabase-provider"

// Add the TypingAnimation component
function TypingAnimation({ text, speed = 50 }: { text: string; speed?: number }) {
  const [displayedText, setDisplayedText] = useState("")
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text[currentIndex])
        setCurrentIndex((prev) => prev + 1)
      }, speed)

      return () => clearTimeout(timeout)
    }
  }, [currentIndex, text, speed])

  return (
    <span>
      {displayedText}
      {currentIndex < text.length && <span className="animate-pulse">|</span>}
    </span>
  )
}

// Add the PulsingDots component
function PulsingDots() {
  return (
    <div className="flex space-x-2 justify-center items-center">
      <div className="h-2 w-2 bg-todo-green rounded-full animate-pulse"></div>
      <div className="h-2 w-2 bg-todo-green rounded-full animate-pulse delay-150"></div>
      <div className="h-2 w-2 bg-todo-green rounded-full animate-pulse delay-300"></div>
    </div>
  )
}

export default function Home() {
  // Inside the Home component, add this line at the top:
  const { supabase } = useSupabase()
  // Document state
  const [documents, setDocuments] = useState<Document[]>([])
  const [activeDocumentId, setActiveDocumentId] = useState<string | null>(null)
  const [documentVersions, setDocumentVersions] = useState<Record<string, string[]>>({})
  const [currentVersionIndices, setCurrentVersionIndices] = useState<Record<string, number>>({})
  const [missingFields, setMissingFields] = useState<string[]>([])
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  const [pdfUrl, setPdfUrl] = useState<string>("")
  const [docxUrl, setDocxUrl] = useState<string>("")
  const [imageUrl, setImageUrl] = useState<string>("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [documentTheme, setDocumentTheme] = useState({
    primaryColor: "#2ECC71", // Green
    secondaryColor: "#A855F7", // Purple
    accentColor: "#2ECC71", // Green
    backgroundColor: "#ffffff", // White (changed from mint to reduce green space)
    textColor: "#1A1E23", // Dark
    fontFamily: "Inter, sans-serif",
  })
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState("chat") // Set chat as the default tab
  const [exportFormat, setExportFormat] = useState<"pdf" | "docx" | "image">("pdf")
  const [isLoading, setIsLoading] = useState(true)

  // Refs
  const previewRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const finalContentRef = useRef<string>("")
  const streamContainerRef = useRef<HTMLDivElement>(null)

  // Handle URL parameters for prompts
  const searchParams = useSearchParams()
  const urlPrompt = searchParams.get("prompt")
  const [hasProcessedUrlPrompt, setHasProcessedUrlPrompt] = useState(false)

  // Get current document content
  const currentDocumentVersions = activeDocumentId ? documentVersions[activeDocumentId] || [] : []
  const currentVersionIndex = activeDocumentId ? currentVersionIndices[activeDocumentId] || 0 : 0
  const currentDocumentContent = currentDocumentVersions[currentVersionIndex] || ""

  // Load documents from Supabase
  useEffect(() => {
    const loadDocuments = async () => {
      setIsLoading(true)
      try {
        // Fetch documents from Supabase
        const { data: documentsData, error: documentsError } = await supabase
          .from("documents")
          .select("*")
          .order("updated_at", { ascending: false })

        if (documentsError) {
          console.error("Error fetching documents:", documentsError)
          return
        }

        if (documentsData && documentsData.length > 0) {
          // Convert Supabase documents to our Document type
          const formattedDocuments = documentsData.map((doc) => ({
            id: doc.id,
            title: doc.title,
            createdAt: new Date(doc.created_at),
            updatedAt: new Date(doc.updated_at),
          }))

          setDocuments(formattedDocuments)

          // Set the first document as active if none is selected
          if (!activeDocumentId && formattedDocuments.length > 0) {
            setActiveDocumentId(formattedDocuments[0].id)

            // Load versions for the first document
            await loadDocumentVersions(formattedDocuments[0].id)
          }
        }
      } catch (error) {
        console.error("Error loading documents:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadDocuments()
  }, [])

  // Load document versions when activeDocumentId changes
  useEffect(() => {
    if (activeDocumentId) {
      loadDocumentVersions(activeDocumentId)
    }
  }, [activeDocumentId])

  // Load document versions from Supabase
  const loadDocumentVersions = async (documentId: string) => {
    try {
      // Fetch document versions from Supabase
      const { data: versionsData, error: versionsError } = await supabase
        .from("document_versions")
        .select("*")
        .eq("document_id", documentId)
        .order("version_number", { ascending: true })

      if (versionsError) {
        console.error(`Error fetching versions for document ${documentId}:`, versionsError)
        return
      }

      if (versionsData && versionsData.length > 0) {
        // Store versions in state
        const versions = versionsData.map((v) => v.content)
        setDocumentVersions((prev) => ({
          ...prev,
          [documentId]: versions,
        }))

        // Set current version to the latest
        setCurrentVersionIndices((prev) => ({
          ...prev,
          [documentId]: versions.length - 1,
        }))

        // Load missing fields for the latest version
        const latestVersion = versions[versions.length - 1]
        const extractedFields = extractMissingFields(latestVersion)
        setMissingFields(extractedFields)

        // Load field values for the document
        await loadFieldValues(documentId)
      } else {
        // If no versions found, fetch the document content
        const { data: documentData, error: documentError } = await supabase
          .from("documents")
          .select("content")
          .eq("id", documentId)
          .single()

        if (documentError) {
          console.error(`Error fetching document ${documentId}:`, documentError)
          return
        }

        if (documentData) {
          // Store the document content as the first version
          setDocumentVersions((prev) => ({
            ...prev,
            [documentId]: [documentData.content],
          }))

          // Set current version to 0
          setCurrentVersionIndices((prev) => ({
            ...prev,
            [documentId]: 0,
          }))

          // Extract missing fields
          const extractedFields = extractMissingFields(documentData.content)
          setMissingFields(extractedFields)

          // Load field values for the document
          await loadFieldValues(documentId)
        }
      }
    } catch (error) {
      console.error(`Error loading versions for document ${documentId}:`, error)
    }
  }

  // Load field values from Supabase
  const loadFieldValues = async (documentId: string) => {
    try {
      // Fetch missing fields from Supabase
      const { data: fieldsData, error: fieldsError } = await supabase
        .from("missing_fields")
        .select("*")
        .eq("document_id", documentId)

      if (fieldsError) {
        console.error(`Error fetching missing fields for document ${documentId}:`, fieldsError)
        return
      }

      if (fieldsData && fieldsData.length > 0) {
        // Convert to field values object
        const values: Record<string, string> = {}
        fieldsData.forEach((field) => {
          if (field.field_value) {
            values[field.field_name] = field.field_value
          }
        })

        setFieldValues(values)
      } else {
        // Reset field values if none found
        setFieldValues({})
      }
    } catch (error) {
      console.error(`Error loading field values for document ${documentId}:`, error)
    }
  }

  // Extract missing fields from content
  const extractMissingFields = (content: string): string[] => {
    const regex = /\[(.*?)\]/g
    const matches = content.match(regex) || []

    // Extract field names and remove duplicates
    const fields = matches.map((match) => match.replace(/[[\]]/g, "").trim()).filter((field) => field.length > 0)

    // Remove duplicates
    return [...new Set(fields)]
  }

  // Handle creating a new document
  const handleCreateDocument = async () => {
    try {
      // Create a new document in Supabase
      const { data, error } = await supabase
        .from("documents")
        .insert([
          {
            title: `New Document ${documents.length + 1}`,
            content: "",
            user_id: "anonymous",
          },
        ])
        .select()
        .single()

      if (error) {
        console.error("Error creating document:", error)
        return
      }

      if (data) {
        const newDoc: Document = {
          id: data.id,
          title: data.title,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
        }

        setDocuments((prev) => [...prev, newDoc])
        setActiveDocumentId(data.id)
        setDocumentVersions({
          ...documentVersions,
          [data.id]: [],
        })
        setCurrentVersionIndices({
          ...currentVersionIndices,
          [data.id]: 0,
        })
        setMissingFields([])
        setFieldValues({})
        setPdfUrl("")
        setDocxUrl("")
        setImageUrl("")
      }
    } catch (error) {
      console.error("Error creating document:", error)
    }
  }

  // Handle selecting a document
  const handleSelectDocument = (documentId: string) => {
    setActiveDocumentId(documentId)
    // The versions and missing fields will be loaded by the useEffect
    setPdfUrl("")
    setDocxUrl("")
    setImageUrl("")
  }

  // Handle deleting a document
  const handleDeleteDocument = async (documentId: string) => {
    try {
      // Delete the document from Supabase
      const { error } = await supabase.from("documents").delete().eq("id", documentId)

      if (error) {
        console.error(`Error deleting document with id ${documentId}:`, error)
        return
      }

      // Update local state
      const updatedDocuments = documents.filter((doc) => doc.id !== documentId)
      setDocuments(updatedDocuments)

      // Remove document versions
      const updatedVersions = { ...documentVersions }
      delete updatedVersions[documentId]
      setDocumentVersions(updatedVersions)

      // Remove version index
      const updatedIndices = { ...currentVersionIndices }
      delete updatedIndices[documentId]
      setCurrentVersionIndices(updatedIndices)

      // If the active document was deleted, set a new active document
      if (activeDocumentId === documentId) {
        const newActiveId = updatedDocuments.length > 0 ? updatedDocuments[0].id : null
        setActiveDocumentId(newActiveId)
        if (newActiveId) {
          await loadDocumentVersions(newActiveId)
        } else {
          setMissingFields([])
          setFieldValues({})
        }
        setPdfUrl("")
        setDocxUrl("")
        setImageUrl("")
      }
    } catch (error) {
      console.error(`Error deleting document with id ${documentId}:`, error)
    }
  }

  // Handle renaming a document
  const handleRenameDocument = async (documentId: string, newTitle: string) => {
    try {
      // Update the document in Supabase
      const { data, error } = await supabase
        .from("documents")
        .update({ title: newTitle })
        .eq("id", documentId)
        .select()
        .single()

      if (error) {
        console.error(`Error renaming document with id ${documentId}:`, error)
        return
      }

      if (data) {
        // Update local state
        setDocuments((docs) =>
          docs.map((doc) =>
            doc.id === documentId
              ? {
                  ...doc,
                  title: newTitle,
                  updatedAt: new Date(data.updated_at),
                }
              : doc,
          ),
        )
      }
    } catch (error) {
      console.error(`Error renaming document with id ${documentId}:`, error)
    }
  }

  // Handle document generation
  const handleGenerateDocument = async (prompt: string) => {
    try {
      if (!activeDocumentId) {
        // Create a new document if none is active
        await handleCreateDocument()
      }

      setIsGenerating(true)
      setIsStreaming(true)
      // Switch to document tab as soon as streaming starts
      setActiveTab("document")
      setPdfUrl("")
      setDocxUrl("")
      setImageUrl("")
      finalContentRef.current = ""

      // Cancel any ongoing streaming
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Create a new AbortController for this request
      abortControllerRef.current = new AbortController()

      // Start streaming
      let streamedContent = ""

      try {
        setIsStreaming(true)

        await streamDocument(
          prompt,
          (chunk) => {
            // Clean up any markdown tags in the chunk
            let cleanedChunk = chunk
            cleanedChunk = cleanedChunk.replace(/```html/g, "")
            cleanedChunk = cleanedChunk.replace(/```/g, "")

            streamedContent += cleanedChunk
            finalContentRef.current = streamedContent

            // Update the stream container in real-time
            if (streamContainerRef.current) {
              streamContainerRef.current.innerHTML = streamedContent
            }

            // Force a re-render to update the UI
            // This is important for real-time streaming display
            setDocumentVersions((prev) => {
              const newVersions = {
                ...prev,
                [activeDocumentId || "temp"]: [streamedContent],
              }
              return newVersions
            })

            // Also update the current version index
            setCurrentVersionIndices((prev) => ({
              ...prev,
              [activeDocumentId || "temp"]: 0,
            }))
          },
          abortControllerRef.current.signal,
        )

        // When streaming is done, use the final accumulated content
        const finalContent = finalContentRef.current

        // Clean up any \`\`\`html and \`\`\` markers
        let cleanedContent = finalContent
        cleanedContent = cleanedContent.replace(/```html/g, "")
        cleanedContent = cleanedContent.replace(/```/g, "")

        const extractedFields = extractMissingFields(cleanedContent)

        if (activeDocumentId) {
          // Update the document in Supabase
          const { data: updatedDoc, error: updateError } = await supabase
            .from("documents")
            .update({
              content: cleanedContent,
              title: prompt.length > 50 ? prompt.substring(0, 50) + "..." : prompt,
            })
            .eq("id", activeDocumentId)
            .select()
            .single()

          if (updateError) {
            console.error(`Error updating document ${activeDocumentId}:`, updateError)
          } else if (updatedDoc) {
            // Update document in local state
            setDocuments((docs) =>
              docs.map((doc) =>
                doc.id === activeDocumentId
                  ? {
                      ...doc,
                      title: updatedDoc.title,
                      updatedAt: new Date(updatedDoc.updated_at),
                    }
                  : doc,
              ),
            )

            // Create a new version in Supabase
            const { data: versions, error: versionsError } = await supabase
              .from("document_versions")
              .select("version_number")
              .eq("document_id", activeDocumentId)
              .order("version_number", { ascending: false })
              .limit(1)

            if (versionsError) {
              console.error(`Error fetching versions for document ${activeDocumentId}:`, versionsError)
            } else {
              const nextVersionNumber = versions && versions.length > 0 ? versions[0].version_number + 1 : 0

              const { error: insertError } = await supabase.from("document_versions").insert([
                {
                  document_id: activeDocumentId,
                  content: cleanedContent,
                  version_number: nextVersionNumber,
                },
              ])

              if (insertError) {
                console.error(`Error creating version for document ${activeDocumentId}:`, insertError)
              } else {
                // Update versions in local state
                setDocumentVersions((prev) => ({
                  ...prev,
                  [activeDocumentId]: [...(prev[activeDocumentId] || []), cleanedContent],
                }))

                setCurrentVersionIndices((prev) => ({
                  ...prev,
                  [activeDocumentId]: (prev[activeDocumentId] || 0) + 1,
                }))
              }
            }

            // Create missing fields in Supabase
            if (extractedFields.length > 0) {
              // Delete existing missing fields
              await supabase.from("missing_fields").delete().eq("document_id", activeDocumentId)

              // Insert new missing fields
              const fieldsToInsert = extractedFields.map((fieldName) => ({
                document_id: activeDocumentId,
                field_name: fieldName,
                field_value: null,
              }))

              const { error: fieldsError } = await supabase.from("missing_fields").insert(fieldsToInsert)

              if (fieldsError) {
                console.error(`Error creating missing fields for document ${activeDocumentId}:`, fieldsError)
              }
            }

            // Update missing fields in local state
            setMissingFields(extractedFields)
            setFieldValues({})
          }
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Error in document streaming:", error)

          // If we have partial content, use it
          if (finalContentRef.current && activeDocumentId) {
            const finalContent = finalContentRef.current

            // Clean up any \`\`\`html and \`\`\` markers
            let cleanedContent = finalContent
            cleanedContent = cleanedContent.replace(/```html/g, "")
            cleanedContent = cleanedContent.replace(/```/g, "")

            const extractedFields = extractMissingFields(cleanedContent)

            // Update the document in Supabase
            await supabase.from("documents").update({ content: cleanedContent }).eq("id", activeDocumentId)

            // Create a new version in Supabase
            const { data: versions } = await supabase
              .from("document_versions")
              .select("version_number")
              .eq("document_id", activeDocumentId)
              .order("version_number", { ascending: false })
              .limit(1)

            const nextVersionNumber = versions && versions.length > 0 ? versions[0].version_number + 1 : 0

            await supabase.from("document_versions").insert([
              {
                document_id: activeDocumentId,
                content: cleanedContent,
                version_number: nextVersionNumber,
              },
            ])

            // Update versions in local state
            setDocumentVersions((prev) => ({
              ...prev,
              [activeDocumentId]: [...(prev[activeDocumentId] || []), cleanedContent],
            }))

            setCurrentVersionIndices((prev) => ({
              ...prev,
              [activeDocumentId]: (prev[activeDocumentId] || 0) + 1,
            }))

            // Create missing fields in Supabase
            if (extractedFields.length > 0) {
              // Delete existing missing fields
              await supabase.from("missing_fields").delete().eq("document_id", activeDocumentId)

              // Insert new missing fields
              const fieldsToInsert = extractedFields.map((fieldName) => ({
                document_id: activeDocumentId,
                field_name: fieldName,
                field_value: null,
              }))

              await supabase.from("missing_fields").insert(fieldsToInsert)
            }

            // Update missing fields in local state
            setMissingFields(extractedFields)
            setFieldValues({})
          }
        }
      }
    } catch (error) {
      console.error("Error in document generation:", error)
    } finally {
      setIsGenerating(false)
      setIsStreaming(false)
    }
  }

  // Handle document update
  const handleUpdateDocument = async (updateInstructions: string) => {
    try {
      if (!activeDocumentId) return

      setIsGenerating(true)
      setIsStreaming(true)
      setPdfUrl("")
      setDocxUrl("")
      setImageUrl("")

      // Switch to document tab as soon as update starts
      setActiveTab("document")

      // Get the current document content
      const currentContent = documentVersions[activeDocumentId]?.[currentVersionIndices[activeDocumentId] || 0]

      if (!currentContent) {
        throw new Error("No document content to update")
      }

      // Call the update API
      const result = await updateDocument(activeDocumentId, currentContent, updateInstructions)

      // Clean up any \`\`\`html and \`\`\` markers
      let cleanedContent = result.content
      cleanedContent = cleanedContent.replace(/```html/g, "")
      cleanedContent = cleanedContent.replace(/```/g, "")

      // Update the document in Supabase
      const { data: updatedDoc, error: updateError } = await supabase
        .from("documents")
        .update({ content: cleanedContent })
        .eq("id", activeDocumentId)
        .select()
        .single()

      if (updateError) {
        console.error(`Error updating document ${activeDocumentId}:`, updateError)
      } else if (updatedDoc) {
        // Create a new version in Supabase
        const { data: versions, error: versionsError } = await supabase
          .from("document_versions")
          .select("version_number")
          .eq("document_id", activeDocumentId)
          .order("version_number", { ascending: false })
          .limit(1)

        if (versionsError) {
          console.error(`Error fetching versions for document ${activeDocumentId}:`, versionsError)
        } else {
          const nextVersionNumber = versions && versions.length > 0 ? versions[0].version_number + 1 : 0

          const { error: insertError } = await supabase.from("document_versions").insert([
            {
              document_id: activeDocumentId,
              content: cleanedContent,
              version_number: nextVersionNumber,
            },
          ])

          if (insertError) {
            console.error(`Error creating version for document ${activeDocumentId}:`, insertError)
          } else {
            // Add the new version to the versions array
            setDocumentVersions((prev) => {
              const currentVersions = prev[activeDocumentId] || []
              return {
                ...prev,
                [activeDocumentId]: [...currentVersions, cleanedContent],
              }
            })

            // Set to the new version
            setCurrentVersionIndices((prev) => ({
              ...prev,
              [activeDocumentId]: (prev[activeDocumentId] || 0) + 1,
            }))
          }
        }

        // Update missing fields in Supabase
        const extractedFields = extractMissingFields(cleanedContent)
        if (extractedFields.length > 0) {
          // Delete existing missing fields
          await supabase.from("missing_fields").delete().eq("document_id", activeDocumentId)

          // Insert new missing fields
          const fieldsToInsert = extractedFields.map((fieldName) => ({
            document_id: activeDocumentId,
            field_name: fieldName,
            field_value: null,
          }))

          const { error: fieldsError } = await supabase.from("missing_fields").insert(fieldsToInsert)

          if (fieldsError) {
            console.error(`Error creating missing fields for document ${activeDocumentId}:`, fieldsError)
          }
        }

        // Update missing fields in local state
        setMissingFields(extractedFields)
        setFieldValues({})
      }
    } catch (error) {
      console.error("Error updating document:", error)
    } finally {
      setIsGenerating(false)
      setIsStreaming(false)
    }
  }

  // Handle direct content update from the editor
  const handleContentUpdate = async (newContent: string) => {
    if (!activeDocumentId) return

    try {
      // Update the document in Supabase
      const { data: updatedDoc, error: updateError } = await supabase
        .from("documents")
        .update({ content: newContent })
        .eq("id", activeDocumentId)
        .select()
        .single()

      if (updateError) {
        console.error(`Error updating document ${activeDocumentId}:`, updateError)
        return
      }

      if (updatedDoc) {
        // Create a new version in Supabase
        const { data: versions, error: versionsError } = await supabase
          .from("document_versions")
          .select("version_number")
          .eq("document_id", activeDocumentId)
          .order("version_number", { ascending: false })
          .limit(1)

        if (versionsError) {
          console.error(`Error fetching versions for document ${activeDocumentId}:`, versionsError)
          return
        }

        const nextVersionNumber = versions && versions.length > 0 ? versions[0].version_number + 1 : 0

        const { error: insertError } = await supabase.from("document_versions").insert([
          {
            document_id: activeDocumentId,
            content: newContent,
            version_number: nextVersionNumber,
          },
        ])

        if (insertError) {
          console.error(`Error creating version for document ${activeDocumentId}:`, insertError)
          return
        }

        // Add the edited content as a new version
        setDocumentVersions((prev) => {
          const currentVersions = prev[activeDocumentId] || []
          return {
            ...prev,
            [activeDocumentId]: [...currentVersions, newContent],
          }
        })

        // Set to the new version
        setCurrentVersionIndices((prev) => ({
          ...prev,
          [activeDocumentId]: (prev[activeDocumentId] || 0) + 1,
        }))

        // Update missing fields
        const extractedFields = extractMissingFields(newContent)
        setMissingFields(extractedFields)

        // Update missing fields in Supabase
        if (extractedFields.length > 0) {
          // Delete existing missing fields
          await supabase.from("missing_fields").delete().eq("document_id", activeDocumentId)

          // Insert new missing fields
          const fieldsToInsert = extractedFields.map((fieldName) => ({
            document_id: activeDocumentId,
            field_name: fieldName,
            field_value: null,
          }))

          await supabase.from("missing_fields").insert(fieldsToInsert)
        }

        // Reset export URLs
        setPdfUrl("")
        setDocxUrl("")
        setImageUrl("")
      }
    } catch (error) {
      console.error("Error updating document content:", error)
    }
  }

  // Handle version change
  const handleVersionChange = async (versionIndex: number) => {
    if (!activeDocumentId) return

    setCurrentVersionIndices((prev) => ({
      ...prev,
      [activeDocumentId]: versionIndex,
    }))

    // Update missing fields for the selected version
    const versionContent = documentVersions[activeDocumentId]?.[versionIndex] || ""
    const extractedFields = extractMissingFields(versionContent)
    setMissingFields(extractedFields)

    // Reset field values
    setFieldValues({})

    // Load field values for the document
    await loadFieldValues(activeDocumentId)

    // Reset export URLs
    setPdfUrl("")
    setDocxUrl("")
    setImageUrl("")
  }

  // Handle field change
  const handleFieldChange = async (field: string, value: string) => {
    if (!activeDocumentId) return

    try {
      // Update field values in local state
      setFieldValues((prev) => ({
        ...prev,
        [field]: value,
      }))

      // Find the missing field in Supabase
      const { data: fieldData, error: fieldError } = await supabase
        .from("missing_fields")
        .select("id")
        .eq("document_id", activeDocumentId)
        .eq("field_name", field)
        .single()

      if (fieldError) {
        console.error(`Error finding missing field ${field} for document ${activeDocumentId}:`, fieldError)
        return
      }

      if (fieldData) {
        // Update the field value in Supabase
        const { error: updateError } = await supabase
          .from("missing_fields")
          .update({ field_value: value })
          .eq("id", fieldData.id)

        if (updateError) {
          console.error(`Error updating missing field ${field} for document ${activeDocumentId}:`, updateError)
        }
      } else {
        // Create a new missing field
        const { error: insertError } = await supabase.from("missing_fields").insert([
          {
            document_id: activeDocumentId,
            field_name: field,
            field_value: value,
          },
        ])

        if (insertError) {
          console.error(`Error creating missing field ${field} for document ${activeDocumentId}:`, insertError)
        }
      }
    } catch (error) {
      console.error(`Error updating field ${field}:`, error)
    }
  }

  // Generate document for export
  const generateExportDocument = async () => {
    try {
      // Create a container element with the current document content
      const contentElement = document.createElement("div")

      // Apply field values to the content
      let processedContent = currentDocumentContent
      Object.entries(fieldValues).forEach(([field, value]) => {
        if (value) {
          const regex = new RegExp(`\\[${field}\\]`, "g")
          processedContent = processedContent.replace(regex, value)
        }
      })

      // Highlight remaining placeholders with proper HTML instead of classes
      processedContent = processedContent.replace(
        /\[(.*?)\]/g,
        '<span style="background-color: #FFEB3B; color: black; padding: 0 4px; border-radius: 4px;">[$1]</span>',
      )

      // Clean up any \`\`\`html and \`\`\` markers
      processedContent = processedContent.replace(/```html/g, "")
      processedContent = processedContent.replace(/```/g, "")

      // Apply direct styling instead of Tailwind classes
      processedContent = processedContent
        // Replace Tailwind heading classes with direct styles
        .replace(
          /<h1([^>]*) class="[^"]*"([^>]*)>(.*?)<\/h1>/gi,
          '<h1$1 style="font-size: 1.875rem; font-weight: bold; margin-bottom: 1.5rem; color: #2ECC71;"$2>$3</h1>',
        )
        .replace(
          /<h2([^>]*) class="[^"]*"([^>]*)>(.*?)<\/h2>/gi,
          '<h2$1 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; color: #2ECC71;"$2>$3</h2>',
        )
        .replace(
          /<h3([^>]*) class="[^"]*"([^>]*)>(.*?)<\/h3>/gi,
          '<h3$1 style="font-size: 1.25rem; font-weight: bold; margin-bottom: 0.75rem; color: #2ECC71;"$2>$3</h3>',
        )
        // Replace Tailwind paragraph classes with direct styles
        .replace(
          /<p([^>]*) class="[^"]*"([^>]*)>(.*?)<\/p>/gi,
          '<p$1 style="margin-bottom: 1rem; color: #333333;"$2>$3</p>',
        )
        // Replace Tailwind table classes with direct styles
        .replace(
          /<table([^>]*) class="[^"]*"([^>]*)>/gi,
          '<table$1 style="width: 100%; border-collapse: collapse; margin-bottom: 1.5rem;"$2>',
        )
        .replace(
          /<th([^>]*) class="[^"]*"([^>]*)>(.*?)<\/th>/gi,
          '<th$1 style="background-color: #2ECC71; color: white; padding: 0.75rem; text-align: left; border: 1px solid #ddd;"$2>$3</th>',
        )
        .replace(
          /<td([^>]*) class="[^"]*"([^>]*)>(.*?)<\/td>/gi,
          '<td$1 style="padding: 0.75rem; border: 1px solid #ddd;"$2>$3</td>',
        )
        // Replace Tailwind list classes with direct styles
        .replace(
          /<ul([^>]*) class="[^"]*"([^>]*)>(.*?)<\/ul>/gis,
          '<ul$1 style="list-style-type: disc; padding-left: 1.25rem; margin-bottom: 1rem;"$2>$3</ul>',
        )
        .replace(
          /<ol([^>]*) class="[^"]*"([^>]*)>(.*?)<\/ol>/gis,
          '<ol$1 style="list-style-type: decimal; padding-left: 1.25rem; margin-bottom: 1rem;"$2>$3</ol>',
        )
        .replace(/<li([^>]*) class="[^"]*"([^>]*)>(.*?)<\/li>/gi, '<li$1 style="margin-bottom: 0.25rem;"$2>$3</li>')
        // Add transaction details section styling
        .replace(
          /<div([^>]*) class="[^"]*bg-(blue|sky|slate)[^"]*"([^>]*)>(.*?)<\/div>/gis,
          '<div$1 style="background-color: #E3F2FD; padding: 1rem; border-radius: 0.5rem; margin-bottom: 1.5rem;"$3>$4</div>',
        )

      contentElement.innerHTML = processedContent

      // Apply theme styles
      contentElement.style.fontFamily = documentTheme.fontFamily
      contentElement.style.color = documentTheme.textColor
      contentElement.style.backgroundColor = documentTheme.backgroundColor
      contentElement.style.padding = "20px"
      contentElement.style.maxWidth = "800px"
      contentElement.style.margin = "0 auto"

      return contentElement
    } catch (error) {
      console.error("Error preparing document for export:", error)
      throw error
    }
  }

  // Replace the existing handleGenerateAndDownloadPdf function with this simplified version:
  const handleGenerateAndDownloadPdf = async () => {
    try {
      setIsGenerating(true)
      setExportFormat("pdf")

      const contentElement = await generateExportDocument()

      // Create a clean clone of the content
      const contentClone = document.createElement("div")
      contentClone.innerHTML = contentElement.innerHTML

      // Apply basic styling
      contentClone.style.fontFamily = "Arial, sans-serif"
      contentClone.style.padding = "20px"
      contentClone.style.backgroundColor = "#ffffff"
      contentClone.style.width = "800px"
      contentClone.style.color = "#333333"

      // Add styling for headings and tables
      const styleElement = document.createElement("style")
      styleElement.textContent = `
        h1, h2, h3, h4, h5, h6 { color: #2ECC71; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        th { background-color: #2ECC71; color: white; padding: 8px; text-align: left; }
        td { padding: 8px; border: 1px solid #ddd; }
      `
      contentClone.appendChild(styleElement)

      // Try the direct text-based approach first
      try {
        const pdfBlob = await generatePdf(contentClone)

        // Download the PDF
        const url = URL.createObjectURL(pdfBlob)
        const link = document.createElement("a")
        link.href = url
        link.download = `${documents.find((doc) => doc.id === activeDocumentId)?.title || "document"}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        // Store the URL for future use
        setPdfUrl(url)
      } catch (directError) {
        console.error("Error with direct PDF generation, trying canvas approach:", directError)

        // Fall back to canvas-based approach
        const pdfBlob = await generatePdfWithCanvas(contentClone)

        // Download the PDF
        const url = URL.createObjectURL(pdfBlob)
        const link = document.createElement("a")
        link.href = url
        link.download = `${documents.find((doc) => doc.id === activeDocumentId)?.title || "document"}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        // Store the URL for future use
        setPdfUrl(url)
      }
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Failed to generate PDF. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  // Replace the existing handleGenerateAndDownloadImage function with this simplified version:
  const handleGenerateAndDownloadImage = async () => {
    try {
      setIsGenerating(true)
      setExportFormat("image")

      const contentElement = await generateExportDocument()

      // Generate the image using the simplified function
      const imageBlob = await generateImage(contentElement)

      // Download the image
      const url = URL.createObjectURL(imageBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${documents.find((doc) => doc.id === activeDocumentId)?.title || "document"}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Store the URL for future use
      setImageUrl(url)
    } catch (error) {
      console.error("Error generating image:", error)
      alert("Failed to generate image. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  // Replace the existing handleGenerateAndDownloadDocx function with this simplified version:
  const handleGenerateAndDownloadDocx = async () => {
    try {
      setIsGenerating(true)
      setExportFormat("docx")

      const contentElement = await generateExportDocument()

      // Create a clean clone of the content
      const contentClone = document.createElement("div")
      contentClone.innerHTML = contentElement.innerHTML

      // Apply basic styling
      contentClone.style.fontFamily = "Arial, sans-serif"
      contentClone.style.padding = "20px"
      contentClone.style.backgroundColor = "#ffffff"
      contentClone.style.width = "800px"
      contentClone.style.color = "#333333"

      // Generate a DOCX document
      const docxBlob = await generateTextDocument(contentClone)

      // Download the DOCX file
      const url = URL.createObjectURL(docxBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${documents.find((doc) => doc.id === activeDocumentId)?.title || "document"}.docx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      // Store the URL for future use
      setDocxUrl(url)
    } catch (error) {
      console.error("Error generating DOCX document:", error)
      alert("Failed to generate DOCX document. Please try again.")
    } finally {
      setIsGenerating(false)
    }
  }

  // Replace the existing handleSaveHtml function with this simplified version:
  const handleSaveHtml = () => {
    try {
      const contentElement = document.createElement("div")
      contentElement.innerHTML = currentDocumentContent

      // Generate HTML using the simplified function
      const htmlBlob = generateHtml(contentElement)

      // Download the HTML file
      const url = URL.createObjectURL(htmlBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${documents.find((doc) => doc.id === activeDocumentId)?.title || "document"}.html`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error("Error saving HTML:", error)
      alert("Failed to save HTML. Please try again.")
    }
  }

  // Handle direct print
  const handlePrint = async () => {
    try {
      const contentElement = await generateExportDocument()
      printDocument(contentElement)
    } catch (error) {
      console.error("Error printing document:", error)
      alert("Failed to print document. Please try again.")
    }
  }

  // Apply Tailwind-inspired styling to HTML content
  const applyTailwindStyling = (content: string): string => {
    // Replace basic HTML elements with Tailwind-styled versions
    let styledContent = content

    // Style headings
    styledContent = styledContent.replace(
      /<h1([^>]*)>(.*?)<\/h1>/gi,
      '<h1$1 class="text-3xl font-bold mb-6 text-todo-green-dark">$2</h1>',
    )
    styledContent = styledContent.replace(
      /<h2([^>]*)>(.*?)<\/h2>/gi,
      '<h2$1 class="text-2xl font-bold mb-4 text-todo-green-dark">$2</h2>',
    )
    styledContent = styledContent.replace(
      /<h3([^>]*)>(.*?)<\/h3>/gi,
      '<h3$1 class="text-xl font-bold mb-3 text-todo-green-dark">$2</h3>',
    )

    // Style paragraphs
    styledContent = styledContent.replace(/<p([^>]*)>(.*?)<\/p>/gi, '<p$1 class="mb-4 text-gray-800">$2</p>')

    // Style tables
    styledContent = styledContent.replace(/<table([^>]*)>/gi, '<table$1 class="w-full border-collapse mb-6">')
    styledContent = styledContent.replace(
      /<th([^>]*)>(.*?)<\/th>/gi,
      '<th$1 class="bg-todo-green text-white p-3 text-left">$2</th>',
    )
    styledContent = styledContent.replace(
      /<td([^>]*)>(.*?)<\/td>/gi,
      '<td$1 class="border-b border-gray-200 p-3">$2</td>',
    )

    // Style links
    styledContent = styledContent.replace(
      /<a([^>]*)>(.*?)<\/a>/gi,
      '<a$1 class="text-todo-green hover:text-todo-green-dark underline">$2</a>',
    )

    // Style lists
    styledContent = styledContent.replace(/<ul([^>]*)>(.*?)<\/ul>/gis, '<ul$1 class="list-disc pl-5 mb-4">$2</ul>')
    styledContent = styledContent.replace(/<ol([^>]*)>(.*?)<\/ol>/gis, '<ol$1 class="list-decimal pl-5 mb-4">$2</ol>')
    styledContent = styledContent.replace(/<li([^>]*)>(.*?)<\/li>/gi, '<li$1 class="mb-1">$2</li>')

    // Add container styling - removed the mint background to reduce green space
    styledContent = `<div class="max-w-4xl mx-auto p-6">
      <div class="bg-white p-6 rounded-lg shadow-sm">
        ${styledContent}
      </div>
    </div>`

    return styledContent
  }

  // Effect to create initial document if none exists
  useEffect(() => {
    if (documents.length === 0 && !isLoading) {
      handleCreateDocument()
    }
  }, [documents.length, isLoading])

  // Effect to handle URL prompt parameter
  useEffect(() => {
    if (urlPrompt && !hasProcessedUrlPrompt) {
      console.log("Found URL prompt:", urlPrompt)

      // Create a new document if none exists
      if (documents.length === 0 && !isLoading) {
        handleCreateDocument()
      }

      // Make sure we're on the chat tab
      setActiveTab("chat")
    }
  }, [urlPrompt, hasProcessedUrlPrompt, documents.length, isLoading])

  // Toggle sidebar for mobile
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  return (
    <main className="h-screen flex flex-col">
      <div className="flex flex-1 overflow-hidden">
        {/* Collapsible Sidebar */}
        <div
          className={`
            ${sidebarOpen ? "w-64" : "w-16"} 
            bg-sidebar border-r transition-all duration-300 ease-in-out
            flex flex-col
          `}
        >
          {/* Logo, title and toggle button at the top of sidebar */}
          <div className="p-4 flex items-center justify-between border-b bg-sidebar">
            <div className="flex items-center gap-2 overflow-hidden">
              <FileText className="h-5 w-5 text-sidebar-accent flex-shrink-0" />
              {sidebarOpen && (
                <div className="overflow-hidden">
                  <h1 className="text-xl font-bold text-sidebar-foreground truncate">docfa.st</h1>
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

          {/* Document List with collapsed state */}
          <DocumentList
            documents={documents}
            activeDocumentId={activeDocumentId}
            onSelectDocument={handleSelectDocument}
            onCreateDocument={handleCreateDocument}
            onDeleteDocument={handleDeleteDocument}
            onRenameDocument={handleRenameDocument}
            collapsed={!sidebarOpen}
          />
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-mint">
          <div className="border-b p-2 flex flex-wrap items-center justify-between bg-mint">
            <div className="flex items-center gap-2 order-1 md:order-1 w-full md:w-auto mb-2 md:mb-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
                <TabsList className="w-full md:w-auto grid grid-cols-2">
                  <TabsTrigger
                    value="chat"
                    className="data-[state=active]:bg-gradient-green data-[state=active]:text-white"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat
                  </TabsTrigger>
                  <TabsTrigger
                    value="document"
                    className="data-[state=active]:bg-gradient-green data-[state=active]:text-white"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Preview
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="order-2 md:order-2 w-full md:w-auto">
              <div className="text-sm font-medium truncate max-w-full md:max-w-[400px]">
                {documents.find((doc) => doc.id === activeDocumentId)?.title || "No document selected"}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <Suspense fallback={<div className="p-4 text-center">Loading...</div>}>
              <Tabs value={activeTab} className="h-full flex flex-col">
                <TabsContent value="chat" className="flex-1 overflow-hidden mt-0">
                  <ChatInterface
                    onGenerateDocument={handleGenerateDocument}
                    isGenerating={isGenerating}
                    onUpdateDocument={handleUpdateDocument}
                    documentVersions={currentDocumentVersions.length}
                    currentVersion={currentVersionIndex}
                    documentId={activeDocumentId}
                    urlPrompt={urlPrompt}
                    hasProcessedUrlPrompt={hasProcessedUrlPrompt}
                    setHasProcessedUrlPrompt={setHasProcessedUrlPrompt}
                  />
                </TabsContent>

                <TabsContent value="document" className="flex-1 overflow-hidden mt-0">
                  <div className="h-full flex flex-col lg:flex-row">
                    {/* Document Preview - make it stack on mobile */}
                    <div className="flex-1 h-[50vh] lg:h-auto overflow-hidden flex flex-col">
                      {currentDocumentVersions.length > 0 && (
                        <>
                          <VersionHistory
                            versions={currentDocumentVersions.length}
                            currentVersion={currentVersionIndex}
                            onVersionChange={handleVersionChange}
                          />

                          <div className="flex-1 overflow-hidden">
                            <EditableDocumentPreview
                              content={currentDocumentContent}
                              fieldValues={fieldValues}
                              ref={previewRef}
                              onContentChange={handleContentUpdate}
                              onGenerateAndDownloadPdf={handleGenerateAndDownloadPdf}
                              onGenerateAndDownloadDocx={handleGenerateAndDownloadDocx}
                              onGenerateAndDownloadImage={handleGenerateAndDownloadImage}
                              isGenerating={isGenerating}
                              exportFormat={exportFormat}
                              setExportFormat={setExportFormat}
                            />
                          </div>
                        </>
                      )}

                      {currentDocumentVersions.length === 0 && !isStreaming && (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center max-w-md p-6">
                            <h3 className="text-lg font-medium mb-2">No Document Content Yet</h3>
                            <p className="text-muted-foreground">
                              Start a conversation in the Chat tab to generate content for this document. Describe what
                              you need, and the AI will create it for you.
                            </p>
                          </div>
                        </div>
                      )}

                      {isStreaming && (
                        <div className="h-full overflow-auto p-6">
                          <div className="mb-4">
                            <h3 className="text-lg font-medium mb-2">Generating Document...</h3>
                            <p className="text-muted-foreground mb-4">
                              <TypingAnimation
                                text="Watch as your document is being created in real-time."
                                speed={50}
                              />
                            </p>
                          </div>
                          <div className="border p-4 rounded bg-white">
                            {finalContentRef.current ? (
                              <div
                                ref={streamContainerRef}
                                className="document-preview"
                                dangerouslySetInnerHTML={{ __html: finalContentRef.current }}
                              />
                            ) : (
                              <div className="flex items-center justify-center py-8">
                                <div className="animate-pulse flex space-x-2">
                                  <div className="h-3 w-3 bg-todo-green rounded-full"></div>
                                  <div className="h-3 w-3 bg-todo-green rounded-full animation-delay-200"></div>
                                  <div className="h-3 w-3 bg-todo-green rounded-full animation-delay-400"></div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Document Customization - make it stack on mobile */}
                    <div className="lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l overflow-auto bg-white h-[50vh] lg:h-auto">
                      <div className="h-full p-4">
                        <DocumentActions
                          onGenerateAndDownloadPdf={handleGenerateAndDownloadPdf}
                          onGenerateAndDownloadDocx={handleGenerateAndDownloadDocx}
                          onGenerateAndDownloadImage={handleGenerateAndDownloadImage}
                          onSaveHtml={handleSaveHtml}
                          isGenerating={isGenerating}
                          missingFields={missingFields}
                          fieldValues={fieldValues}
                          onFieldChange={handleFieldChange}
                          theme={documentTheme}
                          onThemeChange={setDocumentTheme}
                          exportFormat={exportFormat}
                          setExportFormat={setExportFormat}
                          documentRef={previewRef}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  )
}
