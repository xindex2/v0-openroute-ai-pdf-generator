import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Extract missing fields from content
export function extractMissingFields(content: string): string[] {
  const regex = /\[(.*?)\]/g
  const matches = content.match(regex) || []

  // Extract field names and remove duplicates
  const fields = matches.map((match) => match.replace(/[[\]]/g, "").trim()).filter((field) => field.length > 0)

  // Remove duplicates
  return [...new Set(fields)]
}
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
