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
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, fullName: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/me")

      // Check if response is OK before trying to parse JSON
      if (!response.ok) {
        setUser(null)
        return
      }

      // Try to parse the response as JSON
      try {
        const data = await response.json()
        if (data.user) {
          setUser(data.user)
        } else {
          setUser(null)
        }
      } catch (parseError) {
        console.error("Failed to parse auth check response:", parseError)
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
    setError(null)

    try {
      console.log("Attempting login with:", email)

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      console.log("Login response status:", response.status)

      // Check if response is OK before trying to parse JSON
      if (!response.ok) {
        // Try to parse error message from JSON response
        let errorMessage = "Login failed"
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (parseError) {
          // If JSON parsing fails, use text content or status
          const textContent = await response.text()
          console.error("Non-JSON response:", textContent)
          errorMessage = textContent || `Server error: ${response.status}`
        }
        throw new Error(errorMessage)
      }

      // Try to parse the successful response
      let data
      try {
        data = await response.json()
        console.log("Login response data:", data)
      } catch (parseError) {
        console.error("Failed to parse login response:", parseError)
        throw new Error("Invalid response from server")
      }

      if (data.user) {
        setUser(data.user)
      } else {
        throw new Error("Invalid user data received")
      }
    } catch (error) {
      console.error("Login error:", error)
      setError(error instanceof Error ? error.message : "An unknown error occurred")
      throw error
    } finally {
      setLoading(false)
    }
  }

  const register = async (email: string, password: string, fullName: string) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, fullName }),
      })

      // Check if response is OK before trying to parse JSON
      if (!response.ok) {
        // Try to parse error message from JSON response
        let errorMessage = "Registration failed"
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

      // Try to parse the successful response
      let data
      try {
        data = await response.json()
      } catch (parseError) {
        console.error("Failed to parse registration response:", parseError)
        throw new Error("Invalid response from server")
      }

      if (data.user) {
        setUser(data.user)
      } else {
        throw new Error("Invalid user data received")
      }
    } catch (error) {
      console.error("Registration error:", error)
      setError(error instanceof Error ? error.message : "An unknown error occurred")
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      })

      if (!response.ok) {
        console.error("Logout failed with status:", response.status)
      }

      setUser(null)
    } catch (error) {
      console.error("Logout error:", error)
      setError(error instanceof Error ? error.message : "An unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, checkAuth }}>
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
