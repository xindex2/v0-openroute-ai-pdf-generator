"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function CreateTestUserPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createTestUser = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch("/api/create-test-user")
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
      <h1 className="text-2xl font-bold mb-6">Create Test User</h1>

      <Button onClick={createTestUser} disabled={loading}>
        {loading ? "Creating User..." : "Create Test User"}
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

      {result?.success && (
        <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-md">
          <h2 className="font-bold">Test User Created:</h2>
          <p>Email: {result.credentials.email}</p>
          <p>Password: {result.credentials.password}</p>
        </div>
      )}
    </div>
  )
}
