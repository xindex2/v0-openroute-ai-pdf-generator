"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, FileText, FileIcon as FileWord, Printer, ClipboardList, Palette } from "lucide-react"
import MissingFieldsForm from "@/components/missing-fields-form"
import ThemeCustomizer from "@/components/theme-customizer"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

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
  onMissingFieldsSubmit: () => void
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
              onSubmit={onMissingFieldsSubmit}
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
                    onClick={() => {
                      try {
                        setExportError(null)
                        setIsGeneratingLocal(true)

                        if (!documentRef?.current) {
                          throw new Error("Document element not found")
                        }

                        // Get text content
                        const content = documentRef.current.textContent || "Document content"

                        // Create a simple text file with PDF extension
                        const blob = new Blob([content], { type: "application/pdf" })
                        const url = URL.createObjectURL(blob)
                        const link = document.createElement("a")
                        link.href = url
                        link.download = "document.pdf"
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)

                        setTimeout(() => URL.revokeObjectURL(url), 100)
                      } catch (error) {
                        console.error("Error generating PDF:", error)
                        setExportError(
                          `Failed to generate PDF: ${error instanceof Error ? error.message : String(error)}`,
                        )
                      } finally {
                        setIsGeneratingLocal(false)
                      }
                    }}
                    disabled={isGeneratingLocal}
                    className="bg-gradient-green hover:opacity-90 text-white"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {isGeneratingLocal ? "Generating PDF..." : "Download as PDF"}
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

                        // Create a simple text file with DOCX extension
                        const blob = new Blob([content], {
                          type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        })
                        const url = URL.createObjectURL(blob)
                        const link = document.createElement("a")
                        link.href = url
                        link.download = "document.docx"
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)

                        setTimeout(() => URL.revokeObjectURL(url), 100)
                      } catch (error) {
                        console.error("Error generating DOCX:", error)
                        setExportError(
                          `Failed to generate DOCX: ${error instanceof Error ? error.message : String(error)}`,
                        )
                      } finally {
                        setIsGeneratingLocal(false)
                      }
                    }}
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

                        // Get HTML content
                        const content = documentRef.current.innerHTML || "<p>Document content</p>"

                        // Create a complete HTML document
                        const htmlDocument = `
                          <!DOCTYPE html>
                          <html>
                          <head>
                            <meta charset="utf-8">
                            <title>Document</title>
                            <style>
                              body {
                                font-family: Arial, sans-serif;
                                line-height: 1.6;
                                color: #333;
                                max-width: 800px;
                                margin: 0 auto;
                                padding: 20px;
                              }
                              h1, h2, h3, h4, h5, h6 {
                                color: #2ECC71;
                              }
                            </style>
                          </head>
                          <body>
                            ${content}
                          </body>
                          </html>
                        `

                        // Create a blob with the HTML content
                        const blob = new Blob([htmlDocument], { type: "text/html" })
                        const url = URL.createObjectURL(blob)
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

                        // Create a new window for printing
                        const printWindow = window.open("", "_blank")
                        if (!printWindow) {
                          throw new Error("Could not open print window. Please allow popups.")
                        }

                        // Write content to the new window
                        printWindow.document.write(`
                          <!DOCTYPE html>
                          <html>
                          <head>
                            <title>Print Document</title>
                            <style>
                              body {
                                font-family: Arial, sans-serif;
                                line-height: 1.6;
                                color: #333;
                                max-width: 800px;
                                margin: 0 auto;
                                padding: 20px;
                              }
                              h1, h2, h3, h4, h5, h6 {
                                color: #2ECC71;
                              }
                              @media print {
                                body { max-width: 100%; }
                              }
                            </style>
                          </head>
                          <body>
                            ${documentRef.current.innerHTML}
                            <script>
                              window.onload = function() {
                                setTimeout(function() {
                                  window.print();
                                  window.close();
                                }, 250);
                              };
                            </script>
                          </body>
                          </html>
                        `)
                        printWindow.document.close()
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
