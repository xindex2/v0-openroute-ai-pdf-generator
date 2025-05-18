"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Edit, Save, X } from "lucide-react"

interface EditableDocumentPreviewProps {
  content: string
  fieldValues: Record<string, string>
  onContentChange: (newContent: string) => void
  onGenerateAndDownloadPdf: () => void
  onGenerateAndDownloadDocx: () => void
  onGenerateAndDownloadImage: () => void
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
      onGenerateAndDownloadPdf,
      onGenerateAndDownloadDocx,
      onGenerateAndDownloadImage,
      isGenerating,
      exportFormat,
      setExportFormat,
    },
    ref,
  ) => {
    const previewRef = useRef<HTMLDivElement>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [textDirection, setTextDirection] = useState<"ltr" | "rtl">("ltr")

    // Forward the ref to the parent component
    useImperativeHandle(ref, () => previewRef.current as HTMLDivElement)

    // Detect text direction
    const detectTextDirection = (text: string) => {
      const rtlRegex = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/
      return rtlRegex.test(text) ? "rtl" : "ltr"
    }

    // Render preview content
    useEffect(() => {
      if (previewRef.current) {
        try {
          let processedContent = content

          // Only apply field values and highlighting when not editing
          if (!isEditing) {
            // Replace placeholders with values
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
          }

          // Clean up markdown markers
          processedContent = processedContent.replace(/```html/g, "")
          processedContent = processedContent.replace(/```/g, "")

          // Detect text direction
          const detectedDirection = detectTextDirection(processedContent)
          setTextDirection(detectedDirection)

          // Apply text direction to the preview
          previewRef.current.dir = detectedDirection

          // Only update the innerHTML if we're not editing (to avoid cursor jumps)
          if (!isEditing || !previewRef.current.isContentEditable) {
            previewRef.current.innerHTML = processedContent
          }

          // Make editable when in edit mode
          previewRef.current.contentEditable = isEditing ? "true" : "false"
        } catch (error) {
          console.error("Error rendering document preview:", error)
          previewRef.current.innerHTML = `<div class="p-4 text-red-500">Error rendering document: ${
            error instanceof Error ? error.message : String(error)
          }</div>`
        }
      }
    }, [content, fieldValues, isEditing])

    // Start editing mode
    const handleStartEditing = () => {
      setIsEditing(true)

      // Focus after render
      setTimeout(() => {
        if (previewRef.current) {
          previewRef.current.focus()
        }
      }, 50)
    }

    // Save edited content
    const handleSaveEdit = () => {
      if (previewRef.current) {
        // Get the current content
        let newContent = previewRef.current.innerHTML

        // Clean up any markdown markers
        newContent = newContent.replace(/```html/g, "")
        newContent = newContent.replace(/```/g, "")

        // Add direction attribute for RTL text
        if (textDirection === "rtl" && !newContent.includes('dir="rtl"')) {
          if (newContent.match(/^<[a-z]+[^>]*>/i)) {
            newContent = newContent.replace(/^<([a-z]+)([^>]*?)>/i, '<$1$2 dir="rtl">')
          } else {
            newContent = `<div dir="rtl">${newContent}</div>`
          }
        }

        onContentChange(newContent)
      }

      setIsEditing(false)
    }

    // Cancel editing
    const handleCancelEdit = () => {
      setIsEditing(false)
    }

    return (
      <Card className="h-full overflow-hidden flex flex-col bg-white">
        <ScrollArea className="flex-1">
          <div className="bg-white p-6 relative">
            {/* Floating edit button in the top-right corner when not editing */}
            {!isEditing && (
              <Button
                size="sm"
                onClick={handleStartEditing}
                className="absolute top-2 right-2 z-10 bg-gradient-green hover:opacity-90 text-white"
              >
                <Edit className="h-4 w-4 mr-1" /> Edit
              </Button>
            )}

            {/* Floating save/cancel buttons when editing */}
            {isEditing && (
              <div className="absolute top-2 right-2 z-10 flex gap-2">
                <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button size="sm" onClick={handleSaveEdit} className="bg-gradient-green hover:opacity-90 text-white">
                  <Save className="h-4 w-4 mr-1" /> Save
                </Button>
              </div>
            )}

            <div
              ref={previewRef}
              className={`document-preview ${isEditing ? "outline-none min-h-[500px] border border-dashed border-gray-300 p-2 rounded" : ""}`}
              dir={textDirection}
              spellCheck={false}
            />
          </div>
        </ScrollArea>
      </Card>
    )
  },
)

EditableDocumentPreview.displayName = "EditableDocumentPreview"

export default EditableDocumentPreview
