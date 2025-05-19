"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function CreateTablesPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createTables = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/create-tables")
      const data = await response.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Create Database Tables</h1>

      <div className="mb-6 p-4 bg-yellow-50 rounded-md">
        <p className="font-bold text-yellow-700">Warning:</p>
        <p>This will create all necessary database tables for the authentication system.</p>
        <p>If the tables already exist, they will not be modified.</p>
      </div>

      <Button onClick={createTables} disabled={loading}>
        {loading ? "Creating Tables..." : "Create Database Tables"}
      </Button>

      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-500 rounded-md">
          <h2 className="font-bold">Error:</h2>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-4 p-4 bg-gray-50 rounded-md">
          <h2 className="font-bold">Result:</h2>
          <pre className="whitespace-pre-wrap overflow-auto max-h-96">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      <div className="mt-8 p-4 bg-blue-50 rounded-md">
        <h2 className="font-bold">Next Steps:</h2>
        <ol className="list-decimal pl-5 space-y-2">
          <li>After creating the tables, you can test the login with:</li>
          <ul className="list-disc pl-5 mt-2">
            <li>Email: admin@example.com</li>
            <li>Password: admin123</li>
          </ul>
        </ol>
      </div>
    </div>
  )
}
