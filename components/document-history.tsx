"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Clock } from "lucide-react"

export default function DocumentHistory() {
  // Mock data for document history
  const recentDocuments = [
    { id: 1, title: "Invoice #2023-001", date: "2 hours ago" },
    { id: 2, title: "Rental Agreement", date: "Yesterday" },
    { id: 3, title: "Business Proposal", date: "3 days ago" },
  ]

  return (
    <div className="space-y-2">
      {recentDocuments.length > 0 ? (
        recentDocuments.map((doc) => (
          <Card key={doc.id} className="hover:bg-muted/50 transition-colors">
            <CardContent className="p-3 flex justify-between items-center">
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{doc.title}</p>
                  <p className="text-xs text-muted-foreground flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {doc.date}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                Open
              </Button>
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">No recent documents</p>
          </CardContent>
        </Card>
      )}

      <Button variant="outline" className="w-full text-sm" size="sm">
        View All Documents
      </Button>
    </div>
  )
}
