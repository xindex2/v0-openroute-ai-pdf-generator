import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import {
  getDocumentById,
  updateDocument,
  deleteDocument,
  getDocumentVersions,
  createDocumentVersion,
  getMissingFields,
} from "@/lib/db"

// Get a specific document
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth()
    const { id } = params

    const document = await getDocumentById(id, user.id)

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Get document versions
    const versions = await getDocumentVersions(id)

    // Get missing fields
    const missingFields = await getMissingFields(id)

    return NextResponse.json({
      document: {
        id: document.id,
        title: document.title,
        content: document.content,
        createdAt: document.created_at,
        updatedAt: document.updated_at,
      },
      versions: versions.map((v) => ({
        id: v.id,
        content: v.content,
        versionNumber: v.version_number,
        createdAt: v.created_at,
      })),
      missingFields: missingFields.map((f) => ({
        id: f.id,
        fieldName: f.field_name,
        fieldValue: f.field_value,
        createdAt: f.created_at,
        updatedAt: f.updated_at,
      })),
    })
  } catch (error) {
    console.error("Get document error:", error)

    if (error instanceof Error && error.message === "Not authenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    return NextResponse.json({ error: "Failed to get document" }, { status: 500 })
  }
}

// Update a document
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth()
    const { id } = params

    const { title, content, createVersion = false } = await request.json()

    // Check if document exists and belongs to user
    const existingDoc = await getDocumentById(id, user.id)

    if (!existingDoc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // If creating a new version, get current version number
    if (createVersion && content) {
      const versions = await getDocumentVersions(id)
      const versionNumber = versions.length > 0 ? Math.max(...versions.map((v) => v.version_number)) + 1 : 1

      await createDocumentVersion(id, content, versionNumber)
    }

    // Update the document
    const document = await updateDocument(id, user.id, { title, content })

    return NextResponse.json({
      document: {
        id: document.id,
        title: document.title,
        content: document.content,
        createdAt: document.created_at,
        updatedAt: document.updated_at,
      },
    })
  } catch (error) {
    console.error("Update document error:", error)

    if (error instanceof Error && error.message === "Not authenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    return NextResponse.json({ error: "Failed to update document" }, { status: 500 })
  }
}

// Delete a document
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth()
    const { id } = params

    const result = await deleteDocument(id, user.id)

    if (!result) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error("Delete document error:", error)

    if (error instanceof Error && error.message === "Not authenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 })
  }
}
