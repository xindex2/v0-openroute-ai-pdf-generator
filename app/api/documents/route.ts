import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { getDocumentsByUserId, createDocument } from "@/lib/db"

// Get all documents for the current user
export async function GET() {
  try {
    const user = await requireAuth()

    const documents = await getDocumentsByUserId(user.id)

    return NextResponse.json({
      documents: documents.map((doc) => ({
        id: doc.id,
        title: doc.title,
        createdAt: doc.created_at,
        updatedAt: doc.updated_at,
      })),
    })
  } catch (error) {
    console.error("Get documents error:", error)

    if (error instanceof Error && error.message === "Not authenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    return NextResponse.json({ error: "Failed to get documents" }, { status: 500 })
  }
}

// Create a new document
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    const { title, content } = await request.json()

    if (!title || !content) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 })
    }

    const document = await createDocument(user.id, title, content)

    return NextResponse.json({
      document: {
        id: document.id,
        title: document.title,
        createdAt: document.created_at,
        updatedAt: document.updated_at,
      },
    })
  } catch (error) {
    console.error("Create document error:", error)

    if (error instanceof Error && error.message === "Not authenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    return NextResponse.json({ error: "Failed to create document" }, { status: 500 })
  }
}
