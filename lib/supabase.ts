import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://odefqlcwgggmhxdaphnr.supabase.co"
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kZWZxbGN3Z2dnbWh4ZGFwaG5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc0MjcxNDksImV4cCI6MjA2MzAwMzE0OX0.bbg5CrYEoAMv4pbXu2QuTQz2Og06aqgsQ1QbCvQC8Cc"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type UserProfile = {
  id: string
  email: string
  username?: string
  avatar_url?: string
  credits?: number
  created_at?: string
}
