"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"
import { Card } from "@/components/ui/card"

interface PdfPreviewProps {
  content: string
  fieldValues: Record<string, string>
}

const PdfPreview = forwardRef<HTMLDivElement, PdfPreviewProps>(({ content, fieldValues }, ref) => {
  const previewRef = useRef<HTMLDivElement>(null)

  // Forward the ref to the parent component
  useImperativeHandle(ref, () => previewRef.current as HTMLDivElement)

  useEffect(() => {
    if (previewRef.current) {
      let processedContent = content

      // Replace placeholders with values or highlight missing fields
      Object.entries(fieldValues).forEach(([field, value]) => {
        if (value) {
          processedContent = processedContent.replace(new RegExp(`\\[${field}\\]`, "g"), value)
        }
      })

      // Highlight remaining placeholders
      processedContent = processedContent.replace(
        /\[(.*?)\]/g,
        '<span class="bg-yellow-200 text-black px-1 rounded">[$1]</span>',
      )

      previewRef.current.innerHTML = processedContent
    }
  }, [content, fieldValues])

  return (
    <Card className="overflow-hidden">
      <div className="bg-white p-6 min-h-[600px] max-h-[600px] overflow-y-auto">
        <div ref={previewRef} className="pdf-preview" />
      </div>
    </Card>
  )
})

PdfPreview.displayName = "PdfPreview"

export default PdfPreview
