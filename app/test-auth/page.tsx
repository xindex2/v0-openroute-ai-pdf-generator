"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function TestAuthPage() {
  const [loginData, setLoginData] = useState({ email: "", password: "" })
  const [registerData, setRegisterData] = useState({ email: "", password: "", fullName: "" })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Login failed")
      }

      setUser(data.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registerData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Registration failed")
      }

      setUser(data.user)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    setLoading(true)
    setError(null)

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      })
      setUser(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  const checkAuth = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/me")
      const data = await response.json()

      if (response.ok && data.user) {
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Authentication Test</h1>

      {user ? (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Logged In User</CardTitle>
            <CardDescription>You are currently logged in as:</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <span className="font-medium">Name:</span> {user.fullName}
              </div>
              <div>
                <span className="font-medium">Email:</span> {user.email}
              </div>
              <div>
                <span className="font-medium">Role:</span> {user.role}
              </div>
              <div>
                <span className="font-medium">Credits:</span> {user.credits}
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleLogout} disabled={loading}>
              {loading ? "Logging out..." : "Logout"}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Tabs defaultValue="login" className="mb-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>Login with your email and password</CardDescription>
              </CardHeader>
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
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
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Logging in..." : "Login"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Register</CardTitle>
                <CardDescription>Create a new account</CardDescription>
              </CardHeader>
              <form onSubmit={handleRegister}>
                <CardContent className="space-y-4">
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
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Registering..." : "Register"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {error && (
        <div className="p-4 mb-8 bg-red-50 text-red-500 rounded-md">
          <h2 className="font-bold">Error:</h2>
          <p>{error}</p>
        </div>
      )}

      <div className="flex justify-center">
        <Button onClick={checkAuth} variant="outline" disabled={loading}>
          {loading ? "Checking..." : "Check Authentication Status"}
        </Button>
      </div>

      <div className="mt-8 p-4 bg-yellow-50 rounded-md">
        <h2 className="font-bold">Test Credentials:</h2>
        <p>Admin: admin@example.com / admin123</p>
      </div>
    </div>
  )
}
