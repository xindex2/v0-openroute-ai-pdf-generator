"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import ColorPicker from "@/components/color-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEffect } from "react"

interface ThemeCustomizerProps {
  theme: {
    primaryColor: string
    secondaryColor: string
    accentColor: string
    backgroundColor: string
    textColor: string
    fontFamily: string
  }
  onChange: (theme: any) => void
}

export default function ThemeCustomizer({ theme, onChange }: ThemeCustomizerProps) {
  const handleChange = (key: string, value: string) => {
    onChange({
      ...theme,
      [key]: value,
    })
  }

  // Apply theme to preview in real-time
  useEffect(() => {
    const previewElement = document.querySelector(".document-preview") as HTMLElement
    if (previewElement) {
      // Apply theme styles directly to the preview element
      previewElement.style.fontFamily = theme.fontFamily
      previewElement.style.color = theme.textColor
      previewElement.style.backgroundColor = theme.backgroundColor

      // Apply styles to headings
      const headings = previewElement.querySelectorAll("h1, h2, h3, h4, h5, h6")
      headings.forEach((heading) => {
        ;(heading as HTMLElement).style.color = theme.primaryColor
      })

      // Apply styles to links
      const links = previewElement.querySelectorAll("a")
      links.forEach((link) => {
        ;(link as HTMLElement).style.color = theme.accentColor
      })

      // Apply styles to tables
      const tableHeaders = previewElement.querySelectorAll("th")
      tableHeaders.forEach((th) => {
        ;(th as HTMLElement).style.backgroundColor = theme.secondaryColor
        ;(th as HTMLElement).style.color = "#ffffff"
      })
    }
  }, [theme])

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="space-y-2">
          <Label>Primary Color</Label>
          <ColorPicker color={theme.primaryColor} onChange={(color) => handleChange("primaryColor", color)} />
        </div>

        <div className="space-y-2">
          <Label>Secondary Color</Label>
          <ColorPicker color={theme.secondaryColor} onChange={(color) => handleChange("secondaryColor", color)} />
        </div>

        <div className="space-y-2">
          <Label>Accent Color</Label>
          <ColorPicker color={theme.accentColor} onChange={(color) => handleChange("accentColor", color)} />
        </div>

        <div className="space-y-2">
          <Label>Background Color</Label>
          <ColorPicker color={theme.backgroundColor} onChange={(color) => handleChange("backgroundColor", color)} />
        </div>

        <div className="space-y-2">
          <Label>Text Color</Label>
          <ColorPicker color={theme.textColor} onChange={(color) => handleChange("textColor", color)} />
        </div>

        <div className="space-y-2">
          <Label>Font Family</Label>
          <Select value={theme.fontFamily} onValueChange={(value) => handleChange("fontFamily", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select font" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Inter, sans-serif">Inter</SelectItem>
              <SelectItem value="'Times New Roman', serif">Times New Roman</SelectItem>
              <SelectItem value="Arial, sans-serif">Arial</SelectItem>
              <SelectItem value="Georgia, serif">Georgia</SelectItem>
              <SelectItem value="'Courier New', monospace">Courier New</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="p-4 border rounded-md mt-4">
          <h3 className="text-sm font-medium mb-2">Preview</h3>
          <div
            style={{
              fontFamily: theme.fontFamily,
              color: theme.textColor,
              backgroundColor: theme.backgroundColor,
              padding: "10px",
              borderRadius: "4px",
            }}
          >
            <h1 style={{ color: theme.primaryColor, fontSize: "18px", marginBottom: "8px" }}>Sample Heading</h1>
            <p style={{ marginBottom: "8px" }}>
              This is a sample paragraph showing how your document will look with the selected theme.
            </p>
            <a href="#" style={{ color: theme.accentColor }}>
              Sample Link
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
