"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function DebugPage() {
  const [activeTest, setActiveTest] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runTest = async (testName: string, endpoint: string) => {
    setActiveTest(testName)
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(endpoint)
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
      <h1 className="text-3xl font-bold mb-8">Authentication System Debug</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 border rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Database Tests</h2>
          <div className="space-y-4">
            <Button onClick={() => runTest("Database Connection", "/api/db-test")} className="w-full">
              Test SQLite Connection
            </Button>
          </div>
        </div>

        <div className="p-6 border rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Authentication Tests</h2>
          <div className="space-y-4">
            <Link href="/test-auth" className="block">
              <Button className="w-full">Test Login/Register</Button>
            </Link>

            <div className="p-4 bg-yellow-50 rounded-md text-sm">
              <p className="font-medium">Test Credentials:</p>
              <p>Admin: admin@example.com / admin123</p>
              <p className="mt-2 text-xs text-gray-600">(Created automatically on first run)</p>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="mt-8 p-4 bg-blue-50 rounded-md">
          <p className="font-medium">Running test: {activeTest}...</p>
        </div>
      )}

      {error && (
        <div className="mt-8 p-4 bg-red-50 text-red-500 rounded-md">
          <h2 className="font-bold">Error:</h2>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-8">
          <h2 className="font-bold text-lg mb-2">Test Result: {activeTest}</h2>
          <div className="p-4 bg-gray-50 rounded-md">
            <pre className="whitespace-pre-wrap overflow-auto max-h-96">{JSON.stringify(result, null, 2)}</pre>
          </div>
        </div>
      )}

      <div className="mt-8 p-6 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">About SQLite</h2>
        <p>
          SQLite is a self-contained, serverless database engine that stores data in a single file. It's perfect for
          applications that need a simple, reliable database without the complexity of a client-server setup.
        </p>
        <p className="mt-2">
          The database file is stored in the <code>data/database.sqlite</code> directory of your project.
        </p>
        <p className="mt-4 font-medium">Benefits of SQLite:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>No external connections required</li>
          <li>Zero configuration</li>
          <li>Reliable and fast</li>
          <li>Perfect for development and small to medium applications</li>
        </ul>
      </div>
    </div>
  )
}
