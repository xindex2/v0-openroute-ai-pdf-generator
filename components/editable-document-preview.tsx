"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Edit, Save, X, Download, FileText, FileImage, FileIcon as FileWord } from "lucide-react"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

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
    const [editedContent, setEditedContent] = useState(content)
    const [textDirection, setTextDirection] = useState<"ltr" | "rtl">("ltr")

    // Forward the ref to the parent component
    useImperativeHandle(ref, () => previewRef.current as HTMLDivElement)

    useEffect(() => {
      if (!isEditing) {
        setEditedContent(content)
      }
    }, [content, isEditing])

    const detectTextDirection = (text: string) => {
      // Simple detection of RTL scripts - checks for common RTL Unicode character ranges
      const rtlRegex = /[\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC]/
      return rtlRegex.test(text) ? "rtl" : "ltr"
    }

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

          // Detect text direction from content
          const detectedDirection = detectTextDirection(processedContent)
          setTextDirection(detectedDirection)

          // Apply text direction to the preview
          previewRef.current.dir = detectedDirection
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

      // Add direction attribute to the root element if it's RTL
      if (textDirection === "rtl" && !cleanedContent.includes('dir="rtl"')) {
        // If the content starts with a div or other element, add dir attribute
        if (cleanedContent.match(/^<[a-z]+[^>]*>/i)) {
          cleanedContent = cleanedContent.replace(/^<([a-z]+)([^>]*?)>/i, '<$1$2 dir="rtl">')
        } else {
          // Otherwise wrap the content in a div with dir attribute
          cleanedContent = `<div dir="rtl">${cleanedContent}</div>`
        }
      }

      onContentChange(cleanedContent)
      setIsEditing(false)
    }

    const handleCancelEdit = () => {
      setEditedContent(content)
      setIsEditing(false)
    }

    const handleGenerateAndDownload = () => {
      console.log("Generating and downloading document in format:", exportFormat)

      switch (exportFormat) {
        case "pdf":
          onGenerateAndDownloadPdf()
          break
        case "docx":
          onGenerateAndDownloadDocx()
          break
        case "image":
          onGenerateAndDownloadImage()
          break
        default:
          console.error("Unknown export format:", exportFormat)
          // Default to PDF if format is unknown
          onGenerateAndDownloadPdf()
      }
    }

    return (
      <Card className="h-full overflow-hidden flex flex-col bg-white">
        <div className="p-2 border-b flex justify-between gap-2 bg-white">
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                  <X className="h-4 w-4 mr-1" /> Cancel
                </Button>
                <Button size="sm" onClick={handleSaveEdit} className="bg-gradient-green hover:opacity-90 text-white">
                  <Save className="h-4 w-4 mr-1" /> Save
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                  <Edit className="h-4 w-4 mr-1" /> Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTextDirection(textDirection === "ltr" ? "rtl" : "ltr")}
                  title={textDirection === "ltr" ? "Switch to Right-to-Left" : "Switch to Left-to-Right"}
                >
                  {textDirection === "ltr" ? "LTR" : "RTL"}
                </Button>
              </>
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
                className="data-[state=on]:bg-gradient-green data-[state=on]:text-white"
              >
                <FileText className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="docx"
                aria-label="DOCX"
                title="DOCX"
                className="data-[state=on]:bg-gradient-green data-[state=on]:text-white"
              >
                <FileWord className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="image"
                aria-label="Image"
                title="Image"
                className="data-[state=on]:bg-gradient-green data-[state=on]:text-white"
              >
                <FileImage className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="sm"
                  disabled={isGenerating || !content}
                  className="bg-gradient-green hover:opacity-90 text-white"
                >
                  {isGenerating ? (
                    "Generating..."
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" /> Download
                    </>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setExportFormat("pdf")
                    onGenerateAndDownloadPdf()
                  }}
                  disabled={isGenerating || !content}
                >
                  <FileText className="mr-2 h-4 w-4" /> Download as PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setExportFormat("docx")
                    onGenerateAndDownloadDocx()
                  }}
                  disabled={isGenerating || !content}
                >
                  <FileWord className="mr-2 h-4 w-4" /> Download as Text
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setExportFormat("image")
                    onGenerateAndDownloadImage()
                  }}
                  disabled={isGenerating || !content}
                >
                  <FileImage className="mr-2 h-4 w-4" /> Download as Image
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="bg-white p-6">
            {isEditing ? (
              <div
                ref={previewRef}
                contentEditable
                className="outline-none min-h-[500px]"
                dir={textDirection}
                dangerouslySetInnerHTML={{ __html: editedContent }}
                onInput={(e) => {
                  setEditedContent(e.currentTarget.innerHTML)
                  // Update direction based on content while editing
                  const newDirection = detectTextDirection(e.currentTarget.innerHTML)
                  if (newDirection !== textDirection) {
                    setTextDirection(newDirection)
                    e.currentTarget.dir = newDirection
                  }
                }}
              />
            ) : (
              <div ref={previewRef} className="document-preview" dir={textDirection} />
            )}
          </div>
        </ScrollArea>
      </Card>
    )
  },
)

EditableDocumentPreview.displayName = "EditableDocumentPreview"

export default EditableDocumentPreview
