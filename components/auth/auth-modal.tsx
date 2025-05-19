"use client"

import type React from "react"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"

type AuthModalProps = {
  isOpen: boolean
  onClose: () => void
  initialView?: "login" | "register"
  onSuccess?: () => void
}

export function AuthModal({ isOpen, onClose, initialView = "login", onSuccess }: AuthModalProps) {
  const [view, setView] = useState<"login" | "register">(initialView)
  const [loginData, setLoginData] = useState({ email: "", password: "" })
  const [registerData, setRegisterData] = useState({ email: "", password: "", fullName: "" })
  const [error, setError] = useState<string | null>(null)
  const { login, register, loading } = useAuth()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      await login(loginData.email, loginData.password)
      onClose()
      if (onSuccess) onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      await register(registerData.email, registerData.password, registerData.fullName)
      onClose()
      if (onSuccess) onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Authentication</DialogTitle>
          <DialogDescription>Login or create an account to continue</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={view} value={view} onValueChange={(v) => setView(v as "login" | "register")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-4">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Logging in..." : "Login"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="register" className="mt-4">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={registerData.fullName}
                  onChange={(e) => setRegisterData({ ...registerData, fullName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registerEmail">Email</Label>
                <Input
                  id="registerEmail"
                  type="email"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="registerPassword">Password</Label>
                <Input
                  id="registerPassword"
                  type="password"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Registering..." : "Register"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-500 text-sm rounded-md">
            <p>{error}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
