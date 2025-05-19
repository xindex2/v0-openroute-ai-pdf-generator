import ClientPage from "./client-page"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "WriteDoc - AI Document Generator",
  description: "Generate professional documents with AI",
}

export default function Home() {
  return <ClientPage />
}
