export interface Document {
  id: string
  title: string
  content: string
  created_at: string
  updated_at: string
  user_id: string
}

export interface DocumentVersion {
  id: string
  document_id: string
  content: string
  created_at: string
  version_number: number
}

export interface MissingField {
  id: string
  document_id: string
  field_name: string
  field_value: string | null
  created_at: string
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      documents: {
        Row: Document
        Insert: Omit<Document, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<Document, "id" | "created_at" | "updated_at">>
      }
      document_versions: {
        Row: DocumentVersion
        Insert: Omit<DocumentVersion, "id" | "created_at">
        Update: Partial<Omit<DocumentVersion, "id" | "created_at">>
      }
      missing_fields: {
        Row: MissingField
        Insert: Omit<MissingField, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<MissingField, "id" | "created_at" | "updated_at">>
      }
    }
  }
}
