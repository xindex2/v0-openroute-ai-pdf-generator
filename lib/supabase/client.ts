"use client"

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

// Create a single supabase client for the entire client-side application
// Explicitly provide the URL and anon key
export const supabaseClient = createClientComponentClient({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
})

export type { SupabaseClient } from "@supabase/auth-helpers-nextjs"
