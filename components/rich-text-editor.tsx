"use client"

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react"
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Trash2,
  Plus,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Card } from "@/components/ui/card"
import ColorPicker from "@/components/color-picker"

interface RichTextEditorProps {
  initialContent: string
  onChange: (content: string) => void
  onSave: () => void
}

const RichTextEditor = forwardRef<HTMLDivElement, RichTextEditorProps>(({ initialContent, onChange, onSave }, ref) => {
  const editorRef = useRef<HTMLDivElement>(null)
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null)
  const [showElementControls, setShowElementControls] = useState(false)
  const [elementControlsPosition, setElementControlsPosition] = useState({ top: 0, left: 0 })

  // Forward the ref to the parent component
  useImperativeHandle(ref, () => editorRef.current as HTMLDivElement)

  useEffect(() => {
    if (editorRef.current) {
      // Ensure we're setting valid HTML content
      try {
        // Create a temporary div to sanitize the HTML
        const tempDiv = document.createElement("div")
        tempDiv.innerHTML = initialContent

        // Set the sanitized HTML to the editor
        editorRef.current.innerHTML = tempDiv.innerHTML
      } catch (error) {
        console.error("Error setting HTML content:", error)
        editorRef.current.innerHTML = initialContent
      }

      // Make the editor editable
      editorRef.current.contentEditable = "true"

      // Add event listener for content changes
      const handleInput = () => {
        if (editorRef.current) {
          onChange(editorRef.current.innerHTML)
        }
      }

      editorRef.current.addEventListener("input", handleInput)

      // Add click event listener to track selected element
      const handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement
        if (target !== editorRef.current) {
          const closestElement = target.closest("p, h1, h2, h3, h4, h5, h6, li, td, th, div") as HTMLElement

          if (closestElement && editorRef.current?.contains(closestElement)) {
            setSelectedElement(closestElement)

            // Calculate position for element controls
            const rect = closestElement.getBoundingClientRect()
            const editorRect = editorRef.current.getBoundingClientRect()

            setElementControlsPosition({
              top: rect.top - editorRect.top,
              left: rect.right - editorRect.left + 10,
            })

            setShowElementControls(true)
          } else {
            setShowElementControls(false)
          }
        } else {
          setShowElementControls(false)
        }
      }

      editorRef.current.addEventListener("click", handleClick)

      return () => {
        if (editorRef.current) {
          editorRef.current.removeEventListener("input", handleInput)
          editorRef.current.removeEventListener("click", handleClick)
        }
      }
    }
  }, [initialContent, onChange])

  const execCommand = (command: string, value = "") => {
    document.execCommand(command, false, value)
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML)
    }
  }

  const handleDeleteElement = () => {
    if (selectedElement && editorRef.current?.contains(selectedElement)) {
      selectedElement.remove()
      setShowElementControls(false)
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML)
      }
    }
  }

  const handleElementColor = (color: string) => {
    if (selectedElement) {
      selectedElement.style.color = color
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML)
      }
    }
  }

  const handleElementBgColor = (color: string) => {
    if (selectedElement) {
      selectedElement.style.backgroundColor = color
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML)
      }
    }
  }

  const handleAddElement = (type: string) => {
    if (editorRef.current) {
      const newElement = document.createElement(type)

      switch (type) {
        case "h1":
          newElement.textContent = "Heading 1"
          newElement.style.fontSize = "24px"
          newElement.style.fontWeight = "bold"
          newElement.style.marginBottom = "16px"
          break
        case "h2":
          newElement.textContent = "Heading 2"
          newElement.style.fontSize = "20px"
          newElement.style.fontWeight = "bold"
          newElement.style.marginBottom = "14px"
          break
        case "p":
          newElement.textContent = "New paragraph text"
          newElement.style.marginBottom = "12px"
          break
        case "ul":
          newElement.innerHTML = "<li>List item</li>"
          newElement.style.marginBottom = "12px"
          break
        case "table":
          newElement.innerHTML = `
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <thead>
                  <tr>
                    <th style="padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;">Header 1</th>
                    <th style="padding: 8px; border: 1px solid #ddd; background-color: #f2f2f2;">Header 2</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;">Cell 1</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">Cell 2</td>
                  </tr>
                </tbody>
              </table>
            `
          break
      }

      if (selectedElement && editorRef.current.contains(selectedElement)) {
        selectedElement.after(newElement)
      } else {
        editorRef.current.appendChild(newElement)
      }

      onChange(editorRef.current.innerHTML)
    }
  }

  return (
    <div className="relative">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-950 border-b pb-2 mb-4">
        <div className="flex flex-wrap gap-1 mb-2">
          <Button variant="outline" size="icon" onClick={() => execCommand("bold")}>
            <Bold className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => execCommand("italic")}>
            <Italic className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => execCommand("underline")}>
            <Underline className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => execCommand("justifyLeft")}>
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => execCommand("justifyCenter")}>
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => execCommand("justifyRight")}>
            <AlignRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => execCommand("insertUnorderedList")}>
            <List className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => execCommand("insertOrderedList")}>
            <ListOrdered className="h-4 w-4" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <div className="grid gap-2">
                <Button variant="ghost" onClick={() => handleAddElement("h1")}>
                  Add Heading 1
                </Button>
                <Button variant="ghost" onClick={() => handleAddElement("h2")}>
                  Add Heading 2
                </Button>
                <Button variant="ghost" onClick={() => handleAddElement("p")}>
                  Add Paragraph
                </Button>
                <Button variant="ghost" onClick={() => handleAddElement("ul")}>
                  Add List
                </Button>
                <Button variant="ghost" onClick={() => handleAddElement("table")}>
                  Add Table
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">Text Color</Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="grid gap-2">
                <ColorPicker color="#000000" onChange={(color) => execCommand("foreColor", color)} />
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">Background</Button>
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div className="grid gap-2">
                <ColorPicker color="#ffffff" onChange={(color) => execCommand("hiliteColor", color)} />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <Card className="relative min-h-[600px] p-6 overflow-y-auto">
        <div ref={editorRef} className="outline-none" style={{ minHeight: "100%" }} />

        {showElementControls && (
          <div
            className="absolute flex gap-1 bg-white dark:bg-gray-800 border rounded-md p-1 shadow-md"
            style={{
              top: `${elementControlsPosition.top}px`,
              left: `${elementControlsPosition.left}px`,
              zIndex: 100,
            }}
          >
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon">
                  <span
                    className="w-4 h-4"
                    style={{ backgroundColor: selectedElement?.style.color || "#000000" }}
                  ></span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="grid gap-2">
                  <ColorPicker color={selectedElement?.style.color || "#000000"} onChange={handleElementColor} />
                </div>
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon">
                  <span
                    className="w-4 h-4 border"
                    style={{ backgroundColor: selectedElement?.style.backgroundColor || "#ffffff" }}
                  ></span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="grid gap-2">
                  <ColorPicker
                    color={selectedElement?.style.backgroundColor || "#ffffff"}
                    onChange={handleElementBgColor}
                  />
                </div>
              </PopoverContent>
            </Popover>

            <Button variant="ghost" size="icon" onClick={handleDeleteElement}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
})

RichTextEditor.displayName = "RichTextEditor"

export default RichTextEditor
