"use client"

import { useAuth } from "@/context/auth-context"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { LogOut, User, CreditCard } from "lucide-react"
import { useState } from "react"
import AuthModal from "./auth/auth-modal"

interface UserProfileProps {
  collapsed?: boolean
}

export default function UserProfile({ collapsed = false }: UserProfileProps) {
  const { user, profile, signOut } = useAuth()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  const username = profile?.username || user?.email?.split("@")[0] || "User"
  const credits = profile?.credits || 0
  const avatarUrl = profile?.avatar_url

  if (!user) {
    return (
      <div className={`p-4 border-t bg-sidebar flex ${collapsed ? "justify-center" : "justify-between"} items-center`}>
        {!collapsed ? (
          <Button
            onClick={() => setIsAuthModalOpen(true)}
            className="w-full bg-gradient-green hover:opacity-90 text-white"
          >
            Sign In
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsAuthModalOpen(true)}
            className="text-sidebar-foreground hover:text-sidebar-accent"
          >
            <User className="h-4 w-4" />
          </Button>
        )}

        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} defaultTab="login" />
      </div>
    )
  }

  return (
    <div className={`p-4 border-t bg-sidebar flex ${collapsed ? "justify-center" : "justify-between"} items-center`}>
      {!collapsed ? (
        <>
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl || "/placeholder.svg"} alt={username} />
              ) : (
                <AvatarFallback className="bg-sidebar-accent text-white">{username.charAt(0)}</AvatarFallback>
              )}
            </Avatar>
            <div>
              <p className="text-sm font-medium text-sidebar-foreground truncate">{username}</p>
              <p className="text-xs text-sidebar-accent flex items-center">
                <CreditCard className="h-3 w-3 mr-1" />
                {credits} credits
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:text-sidebar-accent">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      ) : (
        <Avatar className="h-8 w-8">
          {avatarUrl ? (
            <AvatarImage src={avatarUrl || "/placeholder.svg"} alt={username} />
          ) : (
            <AvatarFallback className="bg-sidebar-accent text-white">{username.charAt(0)}</AvatarFallback>
          )}
        </Avatar>
      )}
    </div>
  )
}
