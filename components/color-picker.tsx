"use client"

import type React from "react"

import { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface ColorPickerProps {
  color: string
  onChange: (color: string) => void
}

export default function ColorPicker({ color, onChange }: ColorPickerProps) {
  const [inputValue, setInputValue] = useState(color)

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    onChange(e.target.value)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  const handleInputBlur = () => {
    // Validate hex color
    if (/^#[0-9A-F]{6}$/i.test(inputValue)) {
      onChange(inputValue)
    } else {
      setInputValue(color)
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-10 h-10 p-0 border-2" style={{ backgroundColor: color }}>
            <span className="sr-only">Pick a color</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="grid gap-2">
            <div className="grid grid-cols-5 gap-2">
              {[
                "#f43f5e",
                "#ec4899",
                "#8b5cf6",
                "#6366f1",
                "#3b82f6",
                "#0ea5e9",
                "#14b8a6",
                "#10b981",
                "#84cc16",
                "#eab308",
                "#f59e0b",
                "#f97316",
                "#ef4444",
                "#0f172a",
                "#64748b",
              ].map((presetColor) => (
                <Button
                  key={presetColor}
                  variant="outline"
                  className="w-8 h-8 p-0 border-2"
                  style={{ backgroundColor: presetColor }}
                  onClick={() => {
                    onChange(presetColor)
                    setInputValue(presetColor)
                  }}
                >
                  <span className="sr-only">{presetColor}</span>
                </Button>
              ))}
            </div>
            <div className="flex items-center space-x-2">
              <input type="color" value={inputValue} onChange={handleColorChange} className="w-8 h-8 border-0" />
              <Input value={inputValue} onChange={handleInputChange} onBlur={handleInputBlur} className="h-8" />
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <Input value={inputValue} onChange={handleInputChange} onBlur={handleInputBlur} className="h-9" />
    </div>
  )
}
