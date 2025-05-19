"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

type User = {
  id: number
  email: string
  fullName: string
  avatarUrl?: string
  credits: number
  role: string
}

type AuthContextType = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/me")
      const data = await response.json()

      if (response.ok && data.user) {
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error("Auth check error:", error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    setLoading(true)
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Login failed")
      }

      setUser(data.user)
    } catch (error) {
      console.error("Login error:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const register = async (email: string, password: string, fullName: string) => {
    setLoading(true)
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, fullName }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Registration failed")
      }

      setUser(data.user)
    } catch (error) {
      console.error("Registration error:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    setLoading(true)
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      })
      setUser(null)
    } catch (error) {
      console.error("Logout error:", error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
