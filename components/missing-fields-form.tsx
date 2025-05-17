"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

interface MissingFieldsFormProps {
  fields: string[]
  values: Record<string, string>
  onChange: (field: string, value: string) => void
  onSubmit: () => void
  isSubmitting: boolean
}

export default function MissingFieldsForm({
  fields,
  values,
  onChange,
  onSubmit,
  isSubmitting,
}: MissingFieldsFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit()
  }

  if (fields.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">No missing fields detected.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-medium">Please fill in the missing information:</h3>
            <p className="text-xs text-muted-foreground">These fields were identified as requiring input.</p>
          </div>

          {fields.map((field) => (
            <div key={field} className="space-y-2">
              <Label htmlFor={field}>{field}</Label>
              <Input
                id={field}
                value={values[field] || ""}
                onChange={(e) => onChange(field, e.target.value)}
                placeholder={`Enter ${field.toLowerCase()}`}
              />
            </div>
          ))}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-green hover:opacity-90 text-white"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              "Update Document"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
