"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function DbTestPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testConnection = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/db-test")
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
      <h1 className="text-2xl font-bold mb-6">SQLite Database Test</h1>

      <Button onClick={testConnection} disabled={loading}>
        {loading ? "Testing..." : "Test SQLite Connection"}
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

      <div className="mt-8 p-4 bg-yellow-50 rounded-md">
        <h2 className="font-bold">About SQLite:</h2>
        <p className="mt-2">
          SQLite is a self-contained, serverless database engine that stores data in a single file. It's perfect for
          applications that need a simple, reliable database without the complexity of a client-server setup.
        </p>
        <p className="mt-2">
          The database file is stored in the <code>data/database.sqlite</code> directory of your project.
        </p>
      </div>
    </div>
  )
}
