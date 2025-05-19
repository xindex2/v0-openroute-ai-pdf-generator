"use client"

import { useState } from "react"
import { LogOut, User, CreditCard, LogIn } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/auth-context"
import { AuthModal } from "@/components/auth/auth-modal"
import { ProfileModal } from "@/components/user/profile-modal"

interface UserProfileProps {
  collapsed?: boolean
}

export default function UserProfile({ collapsed = false }: UserProfileProps) {
  const { user, loading, logout } = useAuth()
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authModalView, setAuthModalView] = useState<"login" | "register">("login")
  const [profileModalOpen, setProfileModalOpen] = useState(false)

  const handleLoginClick = () => {
    setAuthModalView("login")
    setAuthModalOpen(true)
  }

  const handleRegisterClick = () => {
    setAuthModalView("register")
    setAuthModalOpen(true)
  }

  const handleProfileClick = () => {
    setProfileModalOpen(true)
  }

  const handleLogout = async () => {
    await logout()
  }

  // Show loading state
  if (loading) {
    return (
      <div className={`p-4 border-t bg-sidebar flex ${collapsed ? "justify-center" : "justify-between"} items-center`}>
        <div className="h-8 w-8 rounded-full bg-gray-300 animate-pulse"></div>
      </div>
    )
  }

  // User is logged in
  if (user) {
    return (
      <>
        <div
          className={`p-4 border-t bg-sidebar flex ${collapsed ? "justify-center" : "justify-between"} items-center`}
        >
          {!collapsed ? (
            <>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  {user.avatarUrl ? (
                    <AvatarImage src={user.avatarUrl || "/placeholder.svg"} alt={user.fullName} />
                  ) : (
                    <AvatarFallback className="bg-sidebar-accent text-white">
                      {user.fullName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-sidebar-foreground truncate">{user.fullName}</p>
                  <p className="text-xs text-sidebar-accent flex items-center">
                    <CreditCard className="h-3 w-3 mr-1" />
                    {user.credits} credits
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
                  <DropdownMenuItem onClick={handleProfileClick}>Profile</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Avatar className="h-8 w-8 cursor-pointer" onClick={handleProfileClick}>
              {user.avatarUrl ? (
                <AvatarImage src={user.avatarUrl || "/placeholder.svg"} alt={user.fullName} />
              ) : (
                <AvatarFallback className="bg-sidebar-accent text-white">
                  {user.fullName.charAt(0).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
          )}
        </div>

        <ProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
      </>
    )
  }

  // User is not logged in
  return (
    <>
      <div className={`p-4 border-t bg-sidebar flex ${collapsed ? "justify-center" : "justify-between"} items-center`}>
        {!collapsed ? (
          <div className="flex items-center gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              className="text-sidebar-foreground border-sidebar-accent hover:text-sidebar-accent flex-1"
              onClick={handleLoginClick}
            >
              Login
            </Button>
            <Button
              size="sm"
              className="bg-sidebar-accent hover:bg-sidebar-accent/90 text-white flex-1"
              onClick={handleRegisterClick}
            >
              Register
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="text-sidebar-foreground hover:text-sidebar-accent"
            onClick={handleLoginClick}
          >
            <LogIn className="h-4 w-4" />
          </Button>
        )}
      </div>

      <AuthModal isOpen={authModalOpen} initialView={authModalView} onClose={() => setAuthModalOpen(false)} />
    </>
  )
}
