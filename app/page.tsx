"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Suspense } from "react"
import { FileText, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { generateDocument, streamDocument, updateDocument } from "@/lib/document-actions"
import ChatInterface from "@/components/chat-interface"
import EditableDocumentPreview from "@/components/editable-document-preview"
import DocumentActions from "@/components/document-actions"
import VersionHistory from "@/components/version-history"
import DocumentList, { type Document } from "@/components/document-list"
// Update imports to include the new export functions
import { generatePdf, generateImage, generateHtml, generateTextDocument, printDocument } from "@/lib/simplified-export"

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

  // Handle creating a new document
  const handleCreateDocument = () => {
    const newId = `doc_${Date.now()}`
    const newDoc: Document = {
      id: newId,
      title: `New Document ${documents.length + 1}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    setDocuments([...documents, newDoc])
    setActiveDocumentId(newId)
    setDocumentVersions({
      ...documentVersions,
      [newId]: [],
    })
    setCurrentVersionIndices({
      ...currentVersionIndices,
      [newId]: 0,
    })
    setMissingFields([])
    setFieldValues({})
    setPdfUrl("")
    setDocxUrl("")
    setImageUrl("")
  }

  // Handle selecting a document
  const handleSelectDocument = (documentId: string) => {
    setActiveDocumentId(documentId)
    setMissingFields(extractMissingFields(documentVersions[documentId]?.[currentVersionIndices[documentId] || 0] || ""))
    setFieldValues({})
    setPdfUrl("")
    setDocxUrl("")
    setImageUrl("")
  }

  // Handle deleting a document
  const handleDeleteDocument = (documentId: string) => {
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
        setMissingFields(
          extractMissingFields(documentVersions[newActiveId]?.[currentVersionIndices[newActiveId] || 0] || ""),
        )
      } else {
        setMissingFields([])
      }
      setFieldValues({})
      setPdfUrl("")
      setDocxUrl("")
      setImageUrl("")
    }
  }

  // Handle renaming a document
  const handleRenameDocument = (documentId: string, newTitle: string) => {
    setDocuments((docs) =>
      docs.map((doc) => (doc.id === documentId ? { ...doc, title: newTitle, updatedAt: new Date() } : doc)),
    )
  }

  // Handle document generation
  const handleGenerateDocument = async (prompt: string) => {
    try {
      if (!activeDocumentId) {
        // Create a new document if none is active
        handleCreateDocument()
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

            // Update the current version in real-time
            if (activeDocumentId) {
              setDocumentVersions((prev) => ({
                ...prev,
                [activeDocumentId]: [streamedContent],
              }))
              setCurrentVersionIndices((prev) => ({
                ...prev,
                [activeDocumentId]: 0,
              }))
            }
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

        // Set the final content as the first version
        if (activeDocumentId) {
          setDocumentVersions((prev) => ({
            ...prev,
            [activeDocumentId]: [cleanedContent],
          }))
          setCurrentVersionIndices((prev) => ({
            ...prev,
            [activeDocumentId]: 0,
          }))
          setMissingFields(extractedFields)

          // Update document title based on content if it's a new document
          const currentDoc = documents.find((doc) => doc.id === activeDocumentId)
          if (currentDoc && currentDoc.title.startsWith("New Document")) {
            const titleMatch =
              cleanedContent.match(/<h1[^>]*>(.*?)<\/h1>/i) ||
              cleanedContent.match(/<title[^>]*>(.*?)<\/title>/i) ||
              cleanedContent.match(/<strong[^>]*>(.*?)<\/strong>/i)

            if (titleMatch && titleMatch[1]) {
              const extractedTitle = titleMatch[1].replace(/<[^>]*>/g, "").trim()
              if (extractedTitle) {
                handleRenameDocument(activeDocumentId, extractedTitle)
              }
            }
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

            setDocumentVersions((prev) => ({
              ...prev,
              [activeDocumentId]: [cleanedContent],
            }))
            setCurrentVersionIndices((prev) => ({
              ...prev,
              [activeDocumentId]: 0,
            }))
            setMissingFields(extractedFields)
          } else {
            // Fallback to non-streaming generation
            try {
              const result = await generateDocument(prompt)
              console.log("Document generation successful")

              if (activeDocumentId) {
                // Clean up any \`\`\`html and \`\`\` markers
                let cleanedContent = result.content
                cleanedContent = cleanedContent.replace(/```html/g, "")
                cleanedContent = cleanedContent.replace(/```/g, "")

                setDocumentVersions((prev) => ({
                  ...prev,
                  [activeDocumentId]: [cleanedContent],
                }))
                setCurrentVersionIndices((prev) => ({
                  ...prev,
                  [activeDocumentId]: 0,
                }))
                setMissingFields(result.missingFields || [])
              }
            } catch (fallbackError) {
              console.error("Error in fallback document generation:", fallbackError)
            }
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
      const result = await updateDocument(currentContent, updateInstructions)

      // Clean up any \`\`\`html and \`\`\` markers
      let cleanedContent = result.content
      cleanedContent = cleanedContent.replace(/```html/g, "")
      cleanedContent = cleanedContent.replace(/```/g, "")

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

      setMissingFields(result.missingFields || [])
    } catch (error) {
      console.error("Error updating document:", error)
    } finally {
      setIsGenerating(false)
      setIsStreaming(false)
    }
  }

  // Handle direct content update from the editor
  const handleContentUpdate = (newContent: string) => {
    if (!activeDocumentId) return

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
    setMissingFields(extractMissingFields(newContent))

    // Reset export URLs
    setPdfUrl("")
    setDocxUrl("")
    setImageUrl("")
  }

  // Handle version change
  const handleVersionChange = (versionIndex: number) => {
    if (!activeDocumentId) return

    setCurrentVersionIndices((prev) => ({
      ...prev,
      [activeDocumentId]: versionIndex,
    }))

    // Update missing fields for the selected version
    const versionContent = documentVersions[activeDocumentId]?.[versionIndex] || ""
    setMissingFields(extractMissingFields(versionContent))
    setFieldValues({})
    setPdfUrl("")
    setDocxUrl("")
    setImageUrl("")
  }

  // Handle field change
  const handleFieldChange = (field: string, value: string) => {
    setFieldValues((prev) => ({
      ...prev,
      [field]: value,
    }))
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

      // Highlight remaining placeholders
      processedContent = processedContent.replace(
        /\[(.*?)\]/g,
        '<span class="bg-yellow-200 text-black px-1 rounded">[$1]</span>',
      )

      // Clean up any \`\`\`html and \`\`\` markers
      processedContent = processedContent.replace(/```html/g, "")
      processedContent = processedContent.replace(/```/g, "")

      // Apply Tailwind-inspired styling
      processedContent = applyTailwindStyling(processedContent)

      contentElement.innerHTML = processedContent

      // Apply theme styles
      contentElement.style.fontFamily = documentTheme.fontFamily
      contentElement.style.color = documentTheme.textColor
      contentElement.style.backgroundColor = documentTheme.backgroundColor

      // Add CSS for styling
      const styleElement = document.createElement("style")
      styleElement.textContent = `
        h1, h2, h3, h4, h5, h6 {
          color: ${documentTheme.primaryColor};
        }
        a {
          color: ${documentTheme.accentColor};
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th {
          background-color: ${documentTheme.secondaryColor};
          color: white;
          text-align: left;
          padding: 12px;
          border-bottom: 2px solid #e2e8f0;
        }
        td {
          padding: 12px;
          border-bottom: 1px solid #e2e8f0;
        }
        .header {
          background-color: ${documentTheme.primaryColor};
          color: white;
          padding: 20px;
          margin-bottom: 30px;
          border-radius: 5px;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          text-align: center;
          font-size: 14px;
          color: ${documentTheme.secondaryColor};
        }
      `
      contentElement.appendChild(styleElement)

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

      // Generate the PDF using the simplified function
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
      '<th$1 class="bg-todo-green text-white p-3 text-left">',
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

  // Extract missing fields from content
  const extractMissingFields = (content: string): string[] => {
    const regex = /\[(.*?)\]/g
    const matches = content.match(regex) || []

    // Extract field names and remove duplicates
    const fields = matches.map((match) => match.replace(/[[\]]/g, "").trim()).filter((field) => field.length > 0)

    // Remove duplicates
    return [...new Set(fields)]
  }

  // Effect to create initial document if none exists
  useEffect(() => {
    if (documents.length === 0) {
      handleCreateDocument()
    }
  }, [])

  // Effect to handle URL prompt parameter
  useEffect(() => {
    if (urlPrompt && !hasProcessedUrlPrompt) {
      console.log("Found URL prompt:", urlPrompt)

      // Create a new document if none exists
      if (documents.length === 0) {
        handleCreateDocument()
      }

      // Make sure we're on the chat tab
      setActiveTab("chat")
    }
  }, [urlPrompt, hasProcessedUrlPrompt, documents.length])

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
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <div className="border-b p-2 flex flex-wrap items-center justify-between bg-white">
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
                              <div ref={streamContainerRef} />
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
