"use server"

import { supabase } from "@/lib/supabase"

// Save a chat message
export async function saveChatMessage(documentId: string, role: "user" | "assistant", content: string) {
  try {
    const { error } = await supabase.from("chat_messages").insert([{ document_id: documentId, role, content }])

    if (error) {
      console.error("Error saving chat message:", error)
      throw new Error(error.message)
    }

    return true
  } catch (error) {
    console.error("Error in saveChatMessage:", error)
    throw error
  }
}

// Fetch chat messages for a document
export async function fetchChatMessages(documentId: string) {
  try {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("document_id", documentId)
      .order("timestamp", { ascending: true })

    if (error) {
      console.error("Error fetching chat messages:", error)
      return []
    }

    return data || []
  } catch (error) {
    console.error("Error in fetchChatMessages:", error)
    return []
  }
}

// Delete chat messages for a document
export async function deleteChatMessages(documentId: string) {
  try {
    const { error } = await supabase.from("chat_messages").delete().eq("document_id", documentId)

    if (error) {
      console.error("Error deleting chat messages:", error)
      throw new Error(error.message)
    }

    return true
  } catch (error) {
    console.error("Error in deleteChatMessages:", error)
    throw error
  }
}
