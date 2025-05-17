"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Edit, Save, X, Download, FileText, FileImage, FileIcon as FileWord } from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

interface EditableDocumentPreviewProps {
  content: string
  fieldValues: Record<string, string>
  onContentChange: (newContent: string) => void
  pdfUrl: string
  docxUrl?: string
  imageUrl?: string
  onGeneratePdf: () => void
  onGenerateDocx?: () => void
  onGenerateImage?: () => void
  onDownload: () => void
  isGenerating: boolean
  exportFormat: "pdf" | "docx" | "image"
  setExportFormat: (format: "pdf" | "docx" | "image") => void
}

const EditableDocumentPreview = forwardRef<HTMLDivElement, EditableDocumentPreviewProps>(
  (
    {
      content,
      fieldValues,
      onContentChange,
      pdfUrl,
      docxUrl,
      imageUrl,
      onGeneratePdf,
      onGenerateDocx,
      onGenerateImage,
      onDownload,
      isGenerating,
      exportFormat,
      setExportFormat,
    },
    ref,
  ) => {
    const previewRef = useRef<HTMLDivElement>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [editedContent, setEditedContent] = useState(content)

    // Forward the ref to the parent component
    useImperativeHandle(ref, () => previewRef.current as HTMLDivElement)

    useEffect(() => {
      if (!isEditing) {
        setEditedContent(content)
      }
    }, [content, isEditing])

    useEffect(() => {
      if (previewRef.current && !isEditing) {
        try {
          let processedContent = content

          // Replace placeholders with values or highlight missing fields
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

          // Remove any \`\`\`html and \`\`\` markers that might be in the content
          processedContent = processedContent.replace(/```html/g, "")
          processedContent = processedContent.replace(/```/g, "")

          previewRef.current.innerHTML = processedContent
        } catch (error) {
          console.error("Error rendering document preview:", error)
          previewRef.current.innerHTML = `<div class="p-4 text-red-500">Error rendering document: ${
            error instanceof Error ? error.message : String(error)
          }</div>`
        }
      }
    }, [content, fieldValues, isEditing])

    const handleSaveEdit = () => {
      // Clean up any \`\`\`html and \`\`\` markers before saving
      let cleanedContent = editedContent
      cleanedContent = cleanedContent.replace(/```html/g, "")
      cleanedContent = cleanedContent.replace(/```/g, "")

      onContentChange(cleanedContent)
      setIsEditing(false)
    }

    const handleCancelEdit = () => {
      setEditedContent(content)
      setIsEditing(false)
    }

    const getExportUrl = () => {
      switch (exportFormat) {
        case "pdf":
          return pdfUrl
        case "docx":
          return docxUrl
        case "image":
          return imageUrl
        default:
          return pdfUrl
      }
    }

    const handleGenerate = () => {
      switch (exportFormat) {
        case "pdf":
          onGeneratePdf()
          break
        case "docx":
          onGenerateDocx?.()
          break
        case "image":
          onGenerateImage?.()
          break
      }
    }

    const hasExportUrl = !!getExportUrl()

    return (
      <Card className="h-full overflow-hidden flex flex-col bg-white">
        <div className="p-2 border-b flex justify-between gap-2 bg-white">
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button size="sm" onClick={handleSaveEdit} className="bg-app-green hover:bg-app-green/80 text-white">
                  <Save className="h-4 w-4 mr-1" /> Save
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-1" /> Edit
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ToggleGroup
              type="single"
              value={exportFormat}
              onValueChange={(value) => value && setExportFormat(value as "pdf" | "docx" | "image")}
            >
              <ToggleGroupItem
                value="pdf"
                aria-label="PDF"
                title="PDF"
                className="data-[state=on]:bg-app-green data-[state=on]:text-white"
              >
                <FileText className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="docx"
                aria-label="DOCX"
                title="DOCX"
                className="data-[state=on]:bg-app-green data-[state=on]:text-white"
              >
                <FileWord className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="image"
                aria-label="Image"
                title="Image"
                className="data-[state=on]:bg-app-green data-[state=on]:text-white"
              >
                <FileImage className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>

            {!hasExportUrl ? (
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={isGenerating || !content}
                className="bg-app-green hover:bg-app-green/80 text-white"
              >
                {isGenerating ? "Generating..." : `Generate ${exportFormat.toUpperCase()}`}
              </Button>
            ) : (
              <Button size="sm" onClick={onDownload} className="bg-app-green hover:bg-app-green/80 text-white">
                <Download className="h-4 w-4 mr-1" /> Download
              </Button>
            )}
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="bg-white p-6">
            {isEditing ? (
              <div
                ref={previewRef}
                contentEditable
                className="outline-none min-h-[500px]"
                dangerouslySetInnerHTML={{ __html: editedContent }}
                onInput={(e) => setEditedContent(e.currentTarget.innerHTML)}
              />
            ) : (
              <div ref={previewRef} className="document-preview" />
            )}
          </div>
        </ScrollArea>
      </Card>
    )
  },
)

EditableDocumentPreview.displayName = "EditableDocumentPreview"

export default EditableDocumentPreview
