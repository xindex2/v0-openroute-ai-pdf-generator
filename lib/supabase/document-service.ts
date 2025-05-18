"use server"

import { supabaseServer } from "./server"
import type { Document, DocumentVersion, MissingField } from "./types"

// Document operations
export async function getAllDocuments(): Promise<Document[]> {
  const { data, error } = await supabaseServer.from("documents").select("*").order("updated_at", { ascending: false })

  if (error) {
    console.error("Error fetching documents:", error)
    return []
  }

  return data || []
}

export async function getDocumentById(id: string): Promise<Document | null> {
  const { data, error } = await supabaseServer.from("documents").select("*").eq("id", id).single()

  if (error) {
    console.error(`Error fetching document with id ${id}:`, error)
    return null
  }

  return data
}

export async function createDocument(title: string, content: string, userId = "anonymous"): Promise<Document | null> {
  const { data, error } = await supabaseServer
    .from("documents")
    .insert([{ title, content, user_id: userId }])
    .select()
    .single()

  if (error) {
    console.error("Error creating document:", error)
    return null
  }

  return data
}

export async function updateDocument(id: string, title: string, content: string): Promise<Document | null> {
  const { data, error } = await supabaseServer
    .from("documents")
    .update({ title, content })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error(`Error updating document with id ${id}:`, error)
    return null
  }

  return data
}

export async function deleteDocument(id: string): Promise<boolean> {
  const { error } = await supabaseServer.from("documents").delete().eq("id", id)

  if (error) {
    console.error(`Error deleting document with id ${id}:`, error)
    return false
  }

  return true
}

// Document versions operations
export async function getDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
  const { data, error } = await supabaseServer
    .from("document_versions")
    .select("*")
    .eq("document_id", documentId)
    .order("version_number", { ascending: true })

  if (error) {
    console.error(`Error fetching versions for document ${documentId}:`, error)
    return []
  }

  return data || []
}

export async function createDocumentVersion(
  documentId: string,
  content: string,
  versionNumber: number,
): Promise<DocumentVersion | null> {
  const { data, error } = await supabaseServer
    .from("document_versions")
    .insert([{ document_id: documentId, content, version_number: versionNumber }])
    .select()
    .single()

  if (error) {
    console.error(`Error creating version for document ${documentId}:`, error)
    return null
  }

  return data
}

// Missing fields operations
export async function getMissingFields(documentId: string): Promise<MissingField[]> {
  const { data, error } = await supabaseServer.from("missing_fields").select("*").eq("document_id", documentId)

  if (error) {
    console.error(`Error fetching missing fields for document ${documentId}:`, error)
    return []
  }

  return data || []
}

export async function updateMissingField(id: string, value: string): Promise<MissingField | null> {
  const { data, error } = await supabaseServer
    .from("missing_fields")
    .update({ field_value: value })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error(`Error updating missing field with id ${id}:`, error)
    return null
  }

  return data
}

export async function createMissingFields(documentId: string, fieldNames: string[]): Promise<MissingField[]> {
  if (fieldNames.length === 0) return []

  const fieldsToInsert = fieldNames.map((fieldName) => ({
    document_id: documentId,
    field_name: fieldName,
    field_value: null,
  }))

  const { data, error } = await supabaseServer.from("missing_fields").insert(fieldsToInsert).select()

  if (error) {
    console.error(`Error creating missing fields for document ${documentId}:`, error)
    return []
  }

  return data || []
}
