"use client"

import { useState, useRef, useEffect } from "react"
import { Suspense } from "react"
import { FileText, MessageSquare, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { generateDocument, streamDocument, updateDocument } from "@/lib/document-actions"
import { generatePdfFromHtml } from "@/lib/pdf-generator"
import ChatInterface from "@/components/chat-interface"
import EditableDocumentPreview from "@/components/editable-document-preview"
import DocumentActions from "@/components/document-actions"
import VersionHistory from "@/components/version-history"
import DocumentList, { type Document } from "@/components/document-list"
import { exportAsDocx, exportAsImage } from "@/lib/export-utils"

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
    backgroundColor: "#F0F9EB", // Light mint
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
        await streamDocument(
          prompt,
          (chunk) => {
            streamedContent += chunk
            finalContentRef.current = streamedContent

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
      setIsGenerating(true)

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
    } finally {
      setIsGenerating(false)
    }
  }

  // Generate PDF
  const handleGeneratePdf = async () => {
    try {
      setIsGenerating(true)
      setExportFormat("pdf")

      const contentElement = await generateExportDocument()

      // Generate the PDF
      const pdfBlob = await generatePdfFromHtml(contentElement)
      const url = URL.createObjectURL(pdfBlob)
      setPdfUrl(url)
    } catch (error) {
      console.error("Error generating PDF:", error)
      alert("Failed to generate PDF: " + (error instanceof Error ? error.message : String(error)))
    } finally {
      setIsGenerating(false)
    }
  }

  // Generate DOCX
  const handleGenerateDocx = async () => {
    try {
      setIsGenerating(true)
      setExportFormat("docx")

      const contentElement = await generateExportDocument()

      // Generate the DOCX
      const docxBlob = await exportAsDocx(
        contentElement,
        documents.find((doc) => doc.id === activeDocumentId)?.title || "document",
      )
      const url = URL.createObjectURL(docxBlob)
      setDocxUrl(url)
    } catch (error) {
      console.error("Error generating DOCX:", error)
      alert("Failed to generate DOCX: " + (error instanceof Error ? error.message : String(error)))
    } finally {
      setIsGenerating(false)
    }
  }

  // Generate Image
  const handleGenerateImage = async () => {
    try {
      setIsGenerating(true)
      setExportFormat("image")

      const contentElement = await generateExportDocument()

      // Generate the Image
      const imageBlob = await exportAsImage(contentElement)
      const url = URL.createObjectURL(imageBlob)
      setImageUrl(url)
    } catch (error) {
      console.error("Error generating Image:", error)
      alert("Failed to generate Image: " + (error instanceof Error ? error.message : String(error)))
    } finally {
      setIsGenerating(false)
    }
  }

  // Apply Tailwind-inspired styling to HTML content
  const applyTailwindStyling = (content: string): string => {
    // Replace basic HTML elements with Tailwind-styled versions
    let styledContent = content

    // Style headings
    styledContent = styledContent.replace(
      /<h1([^>]*)>(.*?)<\/h1>/gi,
      '<h1$1 class="text-3xl font-bold mb-6 text-app-green">$2</h1>',
    )
    styledContent = styledContent.replace(
      /<h2([^>]*)>(.*?)<\/h2>/gi,
      '<h2$1 class="text-2xl font-bold mb-4 text-app-green">$2</h2>',
    )
    styledContent = styledContent.replace(
      /<h3([^>]*)>(.*?)<\/h3>/gi,
      '<h3$1 class="text-xl font-bold mb-3 text-app-green">$2</h3>',
    )

    // Style paragraphs
    styledContent = styledContent.replace(/<p([^>]*)>(.*?)<\/p>/gi, '<p$1 class="mb-4 text-gray-800">$2</p>')

    // Style tables
    styledContent = styledContent.replace(/<table([^>]*)>/gi, '<table$1 class="w-full border-collapse mb-6">')
    styledContent = styledContent.replace(
      /<th([^>]*)>(.*?)<\/th>/gi,
      '<th$1 class="bg-app-green text-white p-3 text-left">$2</th>',
    )
    styledContent = styledContent.replace(
      /<td([^>]*)>(.*?)<\/td>/gi,
      '<td$1 class="border-b border-gray-200 p-3">$2</td>',
    )

    // Style links
    styledContent = styledContent.replace(
      /<a([^>]*)>(.*?)<\/a>/gi,
      '<a$1 class="text-app-green hover:text-green-700 underline">$2</a>',
    )

    // Style lists
    styledContent = styledContent.replace(/<ul([^>]*)>(.*?)<\/ul>/gis, '<ul$1 class="list-disc pl-5 mb-4">$2</ul>')
    styledContent = styledContent.replace(/<ol([^>]*)>(.*?)<\/ol>/gis, '<ol$1 class="list-decimal pl-5 mb-4">$2</ol>')
    styledContent = styledContent.replace(/<li([^>]*)>(.*?)<\/li>/gi, '<li$1 class="mb-1">$2</li>')

    // Add container styling
    styledContent = `<div class="max-w-4xl mx-auto p-6 bg-app-mint">
      <div class="bg-white p-6 rounded-lg shadow-sm">
        ${styledContent}
      </div>
    </div>`

    return styledContent
  }

  // Download PDF
  const handleDownloadPdf = () => {
    if (pdfUrl) {
      try {
        console.log("Downloading PDF from URL:", pdfUrl)

        // Create a new anchor element
        const link = document.createElement("a")
        link.href = pdfUrl
        link.download = `${documents.find((doc) => doc.id === activeDocumentId)?.title || "document"}.pdf`

        // Append to the document, click, and remove
        document.body.appendChild(link)
        link.click()

        // Small delay before removing the link
        setTimeout(() => {
          if (document.body.contains(link)) {
            document.body.removeChild(link)
          }
        }, 100)
      } catch (error) {
        console.error("Error downloading PDF:", error)
        alert("Failed to download PDF. Please try again.")
      }
    } else {
      console.warn("No PDF URL available for download")
      // Generate the PDF first if not available
      handleGeneratePdf()
    }
  }

  // Download DOCX
  const handleDownloadDocx = () => {
    if (docxUrl) {
      try {
        console.log("Downloading DOCX from URL:", docxUrl)

        // Create a new anchor element
        const link = document.createElement("a")
        link.href = docxUrl
        link.download = `${documents.find((doc) => doc.id === activeDocumentId)?.title || "document"}.docx`

        // Append to the document, click, and remove
        document.body.appendChild(link)
        link.click()

        // Small delay before removing the link
        setTimeout(() => {
          if (document.body.contains(link)) {
            document.body.removeChild(link)
          }
        }, 100)
      } catch (error) {
        console.error("Error downloading DOCX:", error)
        alert("Failed to download DOCX. Please try again.")
      }
    } else {
      console.warn("No DOCX URL available for download")
      // Generate the DOCX first if not available
      handleGenerateDocx()
    }
  }

  // Download Image
  const handleDownloadImage = () => {
    if (imageUrl) {
      try {
        console.log("Downloading Image from URL:", imageUrl)

        // Create a new anchor element
        const link = document.createElement("a")
        link.href = imageUrl
        link.download = `${documents.find((doc) => doc.id === activeDocumentId)?.title || "document"}.png`

        // Append to the document, click, and remove
        document.body.appendChild(link)
        link.click()

        // Small delay before removing the link
        setTimeout(() => {
          if (document.body.contains(link)) {
            document.body.removeChild(link)
          }
        }, 100)
      } catch (error) {
        console.error("Error downloading Image:", error)
        alert("Failed to download Image. Please try again.")
      }
    } else {
      console.warn("No Image URL available for download")
      // Generate the Image first if not available
      handleGenerateImage()
    }
  }

  // Handle download based on format
  const handleDownload = () => {
    switch (exportFormat) {
      case "pdf":
        handleDownloadPdf()
        break
      case "docx":
        handleDownloadDocx()
        break
      case "image":
        handleDownloadImage()
        break
    }
  }

  // Save HTML
  const handleSaveHtml = () => {
    // Create a blob and download it
    const blob = new Blob([currentDocumentContent], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${documents.find((doc) => doc.id === activeDocumentId)?.title || "document"}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
          {/* Sidebar Header */}
          <div className="p-4 border-b bg-sidebar text-white flex items-center justify-between">
            {sidebarOpen ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-app-green">AI PDF</span>
                </div>
                <Button variant="ghost" size="icon" onClick={toggleSidebar} className="text-white">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="icon" onClick={toggleSidebar} className="text-white mx-auto">
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Document List */}
          {sidebarOpen ? (
            <div className="flex-1 overflow-hidden">
              <DocumentList
                documents={documents}
                activeDocumentId={activeDocumentId}
                onSelectDocument={handleSelectDocument}
                onCreateDocument={handleCreateDocument}
                onDeleteDocument={handleDeleteDocument}
                onRenameDocument={handleRenameDocument}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center pt-4 gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCreateDocument}
                title="New Document"
                className="text-app-green hover:text-app-green/80"
              >
                <Plus className="h-4 w-4" />
              </Button>
              {documents.map((doc) => (
                <Button
                  key={doc.id}
                  variant={activeDocumentId === doc.id ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => handleSelectDocument(doc.id)}
                  title={doc.title}
                  className={
                    activeDocumentId === doc.id ? "bg-app-green text-white" : "text-white hover:text-app-green"
                  }
                >
                  <FileText className="h-4 w-4" />
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-app-mint">
          <div className="border-b p-2 flex items-center justify-between bg-white">
            <div className="flex items-center">
              <div className="ml-2 text-sm font-medium truncate">
                {documents.find((doc) => doc.id === activeDocumentId)?.title || "No document selected"}
              </div>
            </div>
            <div>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-gray-100">
                  <TabsTrigger value="chat" className="data-[state=active]:bg-app-green data-[state=active]:text-white">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Chat
                  </TabsTrigger>
                  <TabsTrigger
                    value="document"
                    className="data-[state=active]:bg-app-green data-[state=active]:text-white"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Document
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <Suspense fallback={<div>Loading...</div>}>
              <Tabs value={activeTab} className="h-full flex flex-col">
                <TabsContent value="chat" className="flex-1 overflow-hidden mt-0">
                  <ChatInterface
                    onGenerateDocument={handleGenerateDocument}
                    isGenerating={isGenerating}
                    onUpdateDocument={handleUpdateDocument}
                    documentVersions={currentDocumentVersions.length}
                    currentVersion={currentVersionIndex}
                  />
                </TabsContent>

                <TabsContent value="document" className="flex-1 overflow-hidden mt-0">
                  <div className="h-full flex flex-col md:flex-row">
                    {/* Document Preview */}
                    <div className="flex-1 h-full md:h-auto overflow-hidden flex flex-col">
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
                              pdfUrl={pdfUrl}
                              docxUrl={docxUrl}
                              imageUrl={imageUrl}
                              onGeneratePdf={handleGeneratePdf}
                              onGenerateDocx={handleGenerateDocx}
                              onGenerateImage={handleGenerateImage}
                              onDownload={handleDownload}
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
                              Watch as your document is being created in real-time.
                            </p>
                          </div>
                          {finalContentRef.current && (
                            <div
                              className="border p-4 rounded bg-white"
                              dangerouslySetInnerHTML={{ __html: finalContentRef.current }}
                            />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Document Customization */}
                    <div className="md:w-80 lg:w-96 border-t md:border-t-0 md:border-l overflow-auto bg-white">
                      <div className="h-full p-4">
                        <DocumentActions
                          onGeneratePdf={handleGeneratePdf}
                          onGenerateDocx={handleGenerateDocx}
                          onGenerateImage={handleGenerateImage}
                          onSaveHtml={handleSaveHtml}
                          onDownloadPdf={handleDownloadPdf}
                          onDownloadDocx={handleDownloadDocx}
                          onDownloadImage={handleDownloadImage}
                          isGenerating={isGenerating}
                          hasPdfUrl={!!pdfUrl}
                          hasDocxUrl={!!docxUrl}
                          hasImageUrl={!!imageUrl}
                          missingFields={missingFields}
                          fieldValues={fieldValues}
                          onFieldChange={handleFieldChange}
                          theme={documentTheme}
                          onThemeChange={setDocumentTheme}
                          exportFormat={exportFormat}
                          setExportFormat={setExportFormat}
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
