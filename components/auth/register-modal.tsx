"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface RegisterModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  onSwitchToLogin?: () => void
}

export function RegisterModal({ isOpen, onClose, onSuccess, onSwitchToLogin }: RegisterModalProps) {
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      console.log("Submitting registration form", { email, fullName })

      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, fullName }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to register")
      }

      console.log("Registration successful", data)

      if (onSuccess) {
        onSuccess()
      }

      onClose()
    } catch (err) {
      console.error("Registration error:", err)
      setError(err instanceof Error ? err.message : "An error occurred during registration")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {error && <div className="text-red-500 text-sm">{error}</div>}

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>

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
            <Button type="button" variant="outline" onClick={onSwitchToLogin}>
              Already have an account?
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Register"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
