"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  onSwitchToRegister?: () => void
}

export function LoginModal({ isOpen, onClose, onSuccess, onSwitchToRegister }: LoginModalProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      console.log("Submitting login form", { email })

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      // Check if response is OK before trying to parse JSON
      if (!response.ok) {
        // Try to parse error message from JSON response
        let errorMessage = "Failed to login"
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (parseError) {
          // If JSON parsing fails, use text content or status
          const textContent = await response.text()
          errorMessage = textContent || `Server error: ${response.status}`
        }
        throw new Error(errorMessage)
      }

      // Parse successful response
      let data
      try {
        data = await response.json()
      } catch (parseError) {
        console.error("Failed to parse JSON response:", parseError)
        throw new Error("Invalid response from server")
      }

      console.log("Login successful", data)

      if (onSuccess) {
        onSuccess()
      }

      onClose()
    } catch (err) {
      console.error("Login error:", err)
      setError(err instanceof Error ? err.message : "An error occurred during login")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Login</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {error && <div className="bg-red-50 p-3 rounded-md text-red-500 text-sm">{error}</div>}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-between items-center pt-2">
            <Button type="button" variant="outline" onClick={onSwitchToRegister} disabled={loading}>
              Create Account
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
