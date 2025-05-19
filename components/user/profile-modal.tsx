"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2 } from "lucide-react"

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, updateProfile, logout } = useAuth()
  const [fullName, setFullName] = useState(user?.fullName || "")
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await updateProfile({ fullName, avatarUrl })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log out")
    }
  }

  if (!user) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Your Profile</DialogTitle>
        </DialogHeader>

        <div className="flex items-center space-x-4 mb-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.avatarUrl || ""} alt={user.fullName} />
            <AvatarFallback>{user.fullName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{user.fullName}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="flex items-center mt-1">
              <span className="text-sm font-medium">{user.credits} credits</span>
              {user.role === "admin" && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-todo-green/20 text-todo-green rounded-full">Admin</span>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 text-sm bg-red-50 text-red-500 rounded-md">{error}</div>}

          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatarUrl">Avatar URL</Label>
            <Input
              id="avatarUrl"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
            />
          </div>

          <div className="flex justify-between pt-2">
            <Button type="button" variant="outline" onClick={handleLogout}>
              Log Out
            </Button>
            <Button type="submit" className="bg-gradient-green text-white" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
