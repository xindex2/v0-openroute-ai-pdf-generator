"use server"

import { supabase } from "@/lib/supabase"
import { revalidatePath } from "next/cache"

// Fetch all documents for a user
export async function fetchUserDocuments(userId: string) {
  try {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })

    if (error) {
      console.error("Error fetching documents:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error in fetchUserDocuments:", error)
    return []
  }
}

// Create a new document
export async function createDocument(userId: string, title: string) {
  try {
    const { data, error } = await supabase
      .from("documents")
      .insert([{ user_id: userId, title }])
      .select()
      .single()

    if (error) {
      console.error("Error creating document:", error)
      throw new Error(error.message)
    }

    revalidatePath("/")
    return data
  } catch (error) {
    console.error("Error in createDocument:", error)
    throw error
  }
}

// Update document title
export async function updateDocumentTitle(documentId: string, title: string) {
  try {
    const { error } = await supabase.from("documents").update({ title }).eq("id", documentId)

    if (error) {
      console.error("Error updating document title:", error)
      throw new Error(error.message)
    }

    revalidatePath("/")
    return true
  } catch (error) {
    console.error("Error in updateDocumentTitle:", error)
    throw error
  }
}

// Delete a document
export async function deleteDocument(documentId: string) {
  try {
    const { error } = await supabase.from("documents").delete().eq("id", documentId)

    if (error) {
      console.error("Error deleting document:", error)
      throw new Error(error.message)
    }

    revalidatePath("/")
    return true
  } catch (error) {
    console.error("Error in deleteDocument:", error)
    throw error
  }
}

// Save document version
export async function saveDocumentVersion(documentId: string, content: string) {
  try {
    // Get the current highest version number
    const { data: versions, error: fetchError } = await supabase
      .from("document_versions")
      .select("version_number")
      .eq("document_id", documentId)
      .order("version_number", { ascending: false })
      .limit(1)

    if (fetchError) {
      console.error("Error fetching document versions:", fetchError)
      throw new Error(fetchError.message)
    }

    const versionNumber = versions && versions.length > 0 ? versions[0].version_number + 1 : 1

    // Insert the new version
    const { error } = await supabase
      .from("document_versions")
      .insert([{ document_id: documentId, content, version_number: versionNumber }])

    if (error) {
      console.error("Error saving document version:", error)
      throw new Error(error.message)
    }

    // Update the document's updated_at timestamp
    await supabase.from("documents").update({ updated_at: new Date().toISOString() }).eq("id", documentId)

    revalidatePath("/")
    return versionNumber
  } catch (error) {
    console.error("Error in saveDocumentVersion:", error)
    throw error
  }
}

// Fetch document versions
export async function fetchDocumentVersions(documentId: string) {
  try {
    const { data, error } = await supabase
      .from("document_versions")
      .select("*")
      .eq("document_id", documentId)
      .order("version_number", { ascending: true })

    if (error) {
      console.error("Error fetching document versions:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error in fetchDocumentVersions:", error)
    return []
  }
}

// Fetch a specific document version
export async function fetchDocumentVersion(documentId: string, versionNumber: number) {
  try {
    const { data, error } = await supabase
      .from("document_versions")
      .select("*")
      .eq("document_id", documentId)
      .eq("version_number", versionNumber)
      .single()

    if (error) {
      console.error("Error fetching document version:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("Error in fetchDocumentVersion:", error)
    return null
  }
}
