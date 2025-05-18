"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, FileText, FileIcon as FileWord, Printer, ClipboardList, Palette } from "lucide-react"
import MissingFieldsForm from "@/components/missing-fields-form"
import ThemeCustomizer from "@/components/theme-customizer"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { generatePdf, generateHtml, generateTextDocument, printDocument } from "@/lib/simplified-export"

interface DocumentActionsProps {
  onGenerateAndDownloadPdf: () => void
  onGenerateAndDownloadDocx: () => void
  onGenerateAndDownloadImage: () => void
  onSaveHtml: () => void
  isGenerating: boolean
  missingFields: string[]
  fieldValues: Record<string, string>
  onFieldChange: (field: string, value: string) => void
  theme: any
  onThemeChange: (theme: any) => void
  exportFormat: "pdf" | "docx" | "image"
  setExportFormat: (format: "pdf" | "docx" | "image") => void
  documentRef?: React.RefObject<HTMLDivElement>
  onMissingFieldsSubmit?: () => void
}

export default function DocumentActions({
  onGenerateAndDownloadPdf,
  onGenerateAndDownloadDocx,
  onGenerateAndDownloadImage,
  onSaveHtml,
  isGenerating,
  missingFields,
  fieldValues,
  onFieldChange,
  theme,
  onThemeChange,
  exportFormat,
  setExportFormat,
  documentRef,
  onMissingFieldsSubmit,
}: DocumentActionsProps) {
  const [exportError, setExportError] = useState<string | null>(null)
  const [isGeneratingLocal, setIsGeneratingLocal] = useState(false)

  // Function to handle PDF export directly
  const handlePdfExport = async () => {
    try {
      setExportError(null)
      setIsGeneratingLocal(true)

      if (!documentRef?.current) {
        throw new Error("Document element not found")
      }

      // Create a clean clone of the content
      const contentClone = document.createElement("div")
      contentClone.innerHTML = documentRef.current.innerHTML

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

      // Generate PDF using the improved function
      const pdfBlob = await generatePdf(contentClone)

      // Download the PDF
      const url = URL.createObjectURL(pdfBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = "document.pdf"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setTimeout(() => URL.revokeObjectURL(url), 100)
    } catch (error) {
      console.error("Error generating PDF:", error)
      setExportError(`Failed to generate PDF: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsGeneratingLocal(false)
    }
  }

  // Function to handle DOCX export directly
  const handleDocxExport = async () => {
    try {
      setExportError(null)
      setIsGeneratingLocal(true)

      if (!documentRef?.current) {
        throw new Error("Document element not found")
      }

      // Create a clean clone of the content
      const contentClone = document.createElement("div")
      contentClone.innerHTML = documentRef.current.innerHTML

      // Apply basic styling
      contentClone.style.fontFamily = "Arial, sans-serif"
      contentClone.style.padding = "20px"
      contentClone.style.backgroundColor = "#ffffff"
      contentClone.style.width = "800px"
      contentClone.style.color = "#333333"

      // Generate DOCX using the improved function
      const docxBlob = await generateTextDocument(contentClone)

      // Download the DOCX
      const url = URL.createObjectURL(docxBlob)
      const link = document.createElement("a")
      link.href = url
      link.download = "document.docx"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setTimeout(() => URL.revokeObjectURL(url), 100)
    } catch (error) {
      console.error("Error generating DOCX:", error)
      setExportError(`Failed to generate DOCX: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsGeneratingLocal(false)
    }
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="fields">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="fields" className="data-[state=active]:bg-gradient-green data-[state=active]:text-white">
            <span className="flex items-center">
              <ClipboardList className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Fields</span>
            </span>
          </TabsTrigger>
          <TabsTrigger value="export" className="data-[state=active]:bg-gradient-green data-[state=active]:text-white">
            <span className="flex items-center">
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Download</span>
            </span>
          </TabsTrigger>
          <TabsTrigger value="theme" className="data-[state=active]:bg-gradient-green data-[state=active]:text-white">
            <span className="flex items-center">
              <Palette className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Theme</span>
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fields">
          <Card className="p-4">
            <h2 className="text-lg font-medium mb-4">Missing Fields</h2>
            <MissingFieldsForm
              fields={missingFields}
              values={fieldValues}
              onChange={onFieldChange}
              onSubmit={onMissingFieldsSubmit || (() => {})}
              isSubmitting={isGeneratingLocal}
            />
          </Card>
        </TabsContent>

        <TabsContent value="export">
          <Card className="p-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Download Options</h3>
                <div className="grid grid-cols-1 gap-2">
                  {/* Loading indicator */}
                  {isGeneratingLocal && (
                    <div className="flex justify-center items-center py-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-todo-green"></div>
                      <span className="ml-2">Generating document...</span>
                    </div>
                  )}

                  <Button
                    onClick={handlePdfExport}
                    disabled={isGeneratingLocal}
                    className="bg-gradient-green hover:opacity-90 text-white"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {isGeneratingLocal ? "Generating PDF..." : "Download as PDF"}
                  </Button>

                  <Button
                    onClick={handleDocxExport}
                    disabled={isGeneratingLocal}
                    className="bg-gradient-green hover:opacity-90 text-white"
                  >
                    <FileWord className="mr-2 h-4 w-4" />
                    {isGeneratingLocal ? "Generating DOCX..." : "Download as DOCX"}
                  </Button>

                  <Button
                    onClick={() => {
                      try {
                        setExportError(null)
                        setIsGeneratingLocal(true)

                        if (!documentRef?.current) {
                          throw new Error("Document element not found")
                        }

                        // Get text content
                        const content = documentRef.current.textContent || "Document content"

                        // Create a text file
                        const blob = new Blob([content], { type: "text/plain" })
                        const url = URL.createObjectURL(blob)
                        const link = document.createElement("a")
                        link.href = url
                        link.download = "document.txt"
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)

                        setTimeout(() => URL.revokeObjectURL(url), 100)
                      } catch (error) {
                        console.error("Error downloading as text:", error)
                        setExportError(
                          `Failed to download as text: ${error instanceof Error ? error.message : String(error)}`,
                        )
                      } finally {
                        setIsGeneratingLocal(false)
                      }
                    }}
                    disabled={isGeneratingLocal}
                    className="bg-gradient-green hover:opacity-90 text-white"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Download as Text
                  </Button>

                  <Button
                    onClick={() => {
                      try {
                        setExportError(null)
                        setIsGeneratingLocal(true)

                        if (!documentRef?.current) {
                          throw new Error("Document element not found")
                        }

                        // Generate HTML using the improved function
                        const htmlBlob = generateHtml(documentRef.current)

                        // Download the HTML
                        const url = URL.createObjectURL(htmlBlob)
                        const link = document.createElement("a")
                        link.href = url
                        link.download = "document.html"
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)

                        setTimeout(() => URL.revokeObjectURL(url), 100)
                      } catch (error) {
                        console.error("Error saving as HTML:", error)
                        setExportError(
                          `Failed to save as HTML: ${error instanceof Error ? error.message : String(error)}`,
                        )
                      } finally {
                        setIsGeneratingLocal(false)
                      }
                    }}
                    disabled={isGeneratingLocal}
                    className="bg-gradient-green hover:opacity-90 text-white"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Save as HTML
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      try {
                        setExportError(null)

                        if (!documentRef?.current) {
                          throw new Error("Document element not found")
                        }

                        // Use the improved print function
                        printDocument(documentRef.current)
                      } catch (error) {
                        console.error("Error printing document:", error)
                        setExportError(`Failed to print: ${error instanceof Error ? error.message : String(error)}`)
                      }
                    }}
                    disabled={isGeneratingLocal}
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </Button>
                </div>
              </div>

              {exportError && (
                <div className="mt-2 p-2 text-sm text-red-500 bg-red-50 border border-red-200 rounded">
                  {exportError}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="theme">
          <Card className="p-4">
            <h2 className="text-lg font-medium mb-4">Theme Customization</h2>
            <ThemeCustomizer theme={theme} onChange={onThemeChange} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
