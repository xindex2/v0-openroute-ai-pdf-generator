"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { LogOut, User, CreditCard, Settings } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import AuthModal from "./auth/auth-modal"

export default function UserMenu() {
  const { user, profile, signOut } = useAuth()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [authModalTab, setAuthModalTab] = useState<"login" | "register">("login")

  const handleOpenAuthModal = (tab: "login" | "register") => {
    setAuthModalTab(tab)
    setIsAuthModalOpen(true)
  }

  return (
    <>
      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                {profile?.avatar_url ? (
                  <AvatarImage
                    src={profile.avatar_url || "/placeholder.svg"}
                    alt={profile.username || user.email || ""}
                  />
                ) : (
                  <AvatarFallback className="bg-sidebar-accent text-white">
                    {profile?.username?.[0] || user.email?.[0] || "U"}
                  </AvatarFallback>
                )}
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-1 leading-none">
                {profile?.username && <p className="font-medium">{profile.username}</p>}
                {user.email && <p className="text-sm text-muted-foreground">{user.email}</p>}
              </div>
            </div>
            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Credits: {profile?.credits || 0}</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600" onClick={() => signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleOpenAuthModal("login")}>
            Sign In
          </Button>
          <Button className="bg-gradient-green" size="sm" onClick={() => handleOpenAuthModal("register")}>
            Sign Up
          </Button>
        </div>
      )}

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} defaultTab={authModalTab} />
    </>
  )
}
