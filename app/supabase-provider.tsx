"use client"

import type React from "react"

import { createContext, useContext, useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { SupabaseClient } from "@supabase/auth-helpers-nextjs"

// Create a context for the Supabase client
type SupabaseContext = {
  supabase: SupabaseClient
}

const Context = createContext<SupabaseContext | undefined>(undefined)

// Provider component to make Supabase client available throughout the app
export default function SupabaseProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [supabase] = useState(() => createClientComponentClient())

  return <Context.Provider value={{ supabase }}>{children}</Context.Provider>
}

// Hook to use the Supabase client
export const useSupabase = () => {
  const context = useContext(Context)
  if (context === undefined) {
    throw new Error("useSupabase must be used inside SupabaseProvider")
  }
  return context
}
