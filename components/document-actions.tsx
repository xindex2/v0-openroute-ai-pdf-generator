"use client"

import { Button } from "@/components/ui/button"
import { Download, Save, FileText, FileImage, FileIcon as FileWord } from "lucide-react"
import MissingFieldsForm from "@/components/missing-fields-form"
import ThemeCustomizer from "@/components/theme-customizer"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

interface DocumentActionsProps {
  onGeneratePdf: () => void
  onGenerateDocx: () => void
  onGenerateImage: () => void
  onSaveHtml: () => void
  onDownloadPdf: () => void
  onDownloadDocx: () => void
  onDownloadImage: () => void
  isGenerating: boolean
  hasPdfUrl: boolean
  hasDocxUrl: boolean
  hasImageUrl: boolean
  missingFields: string[]
  fieldValues: Record<string, string>
  onFieldChange: (field: string, value: string) => void
  theme: any
  onThemeChange: (theme: any) => void
  exportFormat: "pdf" | "docx" | "image"
  setExportFormat: (format: "pdf" | "docx" | "image") => void
}

export default function DocumentActions({
  onGeneratePdf,
  onGenerateDocx,
  onGenerateImage,
  onSaveHtml,
  onDownloadPdf,
  onDownloadDocx,
  onDownloadImage,
  isGenerating,
  hasPdfUrl,
  hasDocxUrl,
  hasImageUrl,
  missingFields,
  fieldValues,
  onFieldChange,
  theme,
  onThemeChange,
  exportFormat,
  setExportFormat,
}: DocumentActionsProps) {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="fields">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="fields" className="data-[state=active]:bg-app-green data-[state=active]:text-white">
            Fields
          </TabsTrigger>
          <TabsTrigger value="export" className="data-[state=active]:bg-app-green data-[state=active]:text-white">
            Export
          </TabsTrigger>
          <TabsTrigger value="theme" className="data-[state=active]:bg-app-green data-[state=active]:text-white">
            Theme
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fields">
          <Card className="p-4">
            <h2 className="text-lg font-medium mb-4">Missing Fields</h2>
            <MissingFieldsForm
              fields={missingFields}
              values={fieldValues}
              onChange={onFieldChange}
              onSubmit={onGeneratePdf}
              isSubmitting={isGenerating}
            />
          </Card>
        </TabsContent>

        <TabsContent value="export">
          <Card className="p-4">
            <h2 className="text-lg font-medium mb-4">Export Options</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={exportFormat === "pdf" ? "default" : "outline"}
                  onClick={() => setExportFormat("pdf")}
                  className={exportFormat === "pdf" ? "bg-app-green hover:bg-app-green/80 text-white" : ""}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  PDF
                </Button>
                <Button
                  variant={exportFormat === "docx" ? "default" : "outline"}
                  onClick={() => setExportFormat("docx")}
                  className={exportFormat === "docx" ? "bg-app-green hover:bg-app-green/80 text-white" : ""}
                >
                  <FileWord className="mr-2 h-4 w-4" />
                  DOCX
                </Button>
                <Button
                  variant={exportFormat === "image" ? "default" : "outline"}
                  onClick={() => setExportFormat("image")}
                  className={exportFormat === "image" ? "bg-app-green hover:bg-app-green/80 text-white" : ""}
                >
                  <FileImage className="mr-2 h-4 w-4" />
                  Image
                </Button>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Generate</h3>
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    onClick={onGeneratePdf}
                    disabled={isGenerating}
                    className="bg-app-green hover:bg-app-green/80 text-white"
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Generate PDF
                  </Button>
                  <Button
                    onClick={onGenerateDocx}
                    disabled={isGenerating}
                    className="bg-app-green hover:bg-app-green/80 text-white"
                  >
                    <FileWord className="mr-2 h-4 w-4" />
                    Generate DOCX
                  </Button>
                  <Button
                    onClick={onGenerateImage}
                    disabled={isGenerating}
                    className="bg-app-green hover:bg-app-green/80 text-white"
                  >
                    <FileImage className="mr-2 h-4 w-4" />
                    Generate Image
                  </Button>
                  <Button variant="outline" onClick={onSaveHtml}>
                    <Save className="mr-2 h-4 w-4" />
                    Save HTML
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">Download</h3>
                <div className="grid grid-cols-1 gap-2">
                  {hasPdfUrl && (
                    <Button onClick={onDownloadPdf} className="bg-app-green hover:bg-app-green/80 text-white">
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </Button>
                  )}
                  {hasDocxUrl && (
                    <Button onClick={onDownloadDocx} className="bg-app-green hover:bg-app-green/80 text-white">
                      <Download className="mr-2 h-4 w-4" />
                      Download DOCX
                    </Button>
                  )}
                  {hasImageUrl && (
                    <Button onClick={onDownloadImage} className="bg-app-green hover:bg-app-green/80 text-white">
                      <Download className="mr-2 h-4 w-4" />
                      Download Image
                    </Button>
                  )}
                </div>
              </div>
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
