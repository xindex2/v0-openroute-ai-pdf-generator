"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import ColorPicker from "@/components/color-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
