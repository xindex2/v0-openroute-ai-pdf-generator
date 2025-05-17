"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { History, ChevronLeft, ChevronRight } from "lucide-react"

interface VersionHistoryProps {
  versions: number
  currentVersion: number
  onVersionChange: (version: number) => void
}

export default function VersionHistory({ versions, currentVersion, onVersionChange }: VersionHistoryProps) {
  if (versions <= 1) {
    return null
  }

  return (
    <Card className="mb-4 border-todo-green/20 dark:border-todo-green/10">
      <CardContent className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-todo-green" />
          <span className="text-sm">
            Version {currentVersion + 1} of {versions}
          </span>
        </div>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={currentVersion === 0}
            onClick={() => onVersionChange(currentVersion - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={currentVersion === versions - 1}
            onClick={() => onVersionChange(currentVersion + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
