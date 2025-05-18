"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Download, FileText, FileImage, FileIcon as FileWord, Printer, ClipboardList, Palette } from "lucide-react"
import MissingFieldsForm from "@/components/missing-fields-form"
import ThemeCustomizer from "@/components/theme-customizer"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useState } from "react"
import { printDocument } from "@/lib/simplified-export"

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
}: DocumentActionsProps) {
  const [exportError, setExportError] = useState<string | null>(null)

  // Remove the handleExport function entirely as we're now calling the export functions directly

  const handlePrint = () => {
    try {
      setExportError(null)
      if (documentRef?.current) {
        printDocument(documentRef.current)
      } else {
        setExportError("Document element not found. Please try again.")
      }
    } catch (error) {
      console.error("Error printing document:", error)
      setExportError(`Failed to print document. Please try again.`)
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
              onSubmit={() => onGenerateAndDownloadPdf()}
              isSubmitting={isGenerating}
            />
          </Card>
        </TabsContent>

        <TabsContent value="export">
          <Card className="p-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Download Options</h3>
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    onClick={onGenerateAndDownloadPdf}
                    disabled={isGenerating}
                    className="bg-gradient-green hover:opacity-90 text-white"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {isGenerating ? "Generating..." : "Download as PDF"}
                  </Button>
                  <Button
                    onClick={onGenerateAndDownloadDocx}
                    disabled={isGenerating}
                    className="bg-gradient-green hover:opacity-90 text-white"
                  >
                    <FileWord className="mr-2 h-4 w-4" />
                    {isGenerating ? "Generating..." : "Download as DOCX"}
                  </Button>
                  <Button
                    onClick={onGenerateAndDownloadImage}
                    disabled={isGenerating}
                    className="bg-gradient-green hover:opacity-90 text-white"
                  >
                    <FileImage className="mr-2 h-4 w-4" />
                    {isGenerating ? "Generating..." : "Download as Image"}
                  </Button>
                  <Button variant="outline" onClick={handlePrint} disabled={isGenerating}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print / Save as PDF
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
