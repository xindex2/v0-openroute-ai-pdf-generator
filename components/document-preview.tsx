"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

interface DocumentPreviewProps {
  content: string
  fieldValues: Record<string, string>
}

const DocumentPreview = forwardRef<HTMLDivElement, DocumentPreviewProps>(({ content, fieldValues }, ref) => {
  const previewRef = useRef<HTMLDivElement>(null)

  // Forward the ref to the parent component
  useImperativeHandle(ref, () => previewRef.current as HTMLDivElement)

  useEffect(() => {
    if (previewRef.current && content) {
      try {
        let processedContent = content

        // Remove any markdown code block markers
        processedContent = processedContent.replace(/```html/g, "")
        processedContent = processedContent.replace(/```/g, "")

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

        previewRef.current.innerHTML = processedContent
      } catch (error) {
        console.error("Error rendering document preview:", error)
        previewRef.current.innerHTML = `<div class="p-4 text-red-500">Error rendering document: ${error instanceof Error ? error.message : String(error)}</div>`
      }
    }
  }, [content, fieldValues])

  return (
    <Card className="h-full overflow-hidden">
      <ScrollArea className="h-full">
        <div className="bg-white p-6">
          <div ref={previewRef} className="document-preview" />
        </div>
      </ScrollArea>
    </Card>
  )
})

DocumentPreview.displayName = "DocumentPreview"

export default DocumentPreview
