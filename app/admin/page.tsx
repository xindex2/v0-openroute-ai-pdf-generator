"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Users, CreditCard, BarChart, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function AdminDashboard() {
  const { user, loading } = useAuth()
  const [users, setUsers] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [creditAmount, setCreditAmount] = useState(100)
  const [creditDescription, setCreditDescription] = useState("")
  const [isAddingCredits, setIsAddingCredits] = useState(false)

  useEffect(() => {
    if (!loading && user?.role !== "admin") {
      window.location.href = "/"
    }
  }, [loading, user])

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true)
      try {
        // Fetch users
        const usersResponse = await fetch("/api/admin/users")
        if (!usersResponse.ok) throw new Error("Failed to fetch users")
        const usersData = await usersResponse.json()
        setUsers(usersData.users)

        // Fetch stats
        const statsResponse = await fetch("/api/admin/stats")
        if (!statsResponse.ok) throw new Error("Failed to fetch stats")
        const statsData = await statsResponse.json()
        setStats(statsData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setIsLoading(false)
      }
    }

    if (user?.role === "admin") {
      fetchData()
    }
  }, [user])

  const handleAddCredits = async () => {
    if (!selectedUser) return

    setIsAddingCredits(true)
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          credits: creditAmount,
          description: creditDescription || `Admin added ${creditAmount} credits`,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to add credits")
      }

      // Update the user in the list
      const data = await response.json()
      setUsers(users.map((u) => (u.id === selectedUser.id ? { ...u, credits: data.credits } : u)))

      // Reset form
      setCreditAmount(100)
      setCreditDescription("")
      setSelectedUser(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add credits")
    } finally {
      setIsAddingCredits(false)
    }
  }

  if (loading || (user && user.role !== "admin")) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-todo-green" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Link href="/">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to App
          </Button>
        </Link>
      </div>

      {error && <div className="bg-red-50 p-4 rounded-md text-red-500 mb-6">{error}</div>}

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-todo-green" />
        </div>
      ) : (
        <Tabs defaultValue="overview">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="credits">Credits Management</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-todo-green mr-2" />
                    <span className="text-2xl font-bold">{stats?.summary.totalUsers || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <BarChart className="h-5 w-5 text-todo-green mr-2" />
                    <span className="text-2xl font-bold">{stats?.summary.totalUsage || 0} actions</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Credits Used</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <CreditCard className="h-5 w-5 text-todo-green mr-2" />
                    <span className="text-2xl font-bold">{stats?.summary.totalCredits || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Usage by Action Type</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action Type</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead>Credits Used</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats?.stats.map((stat: any) => (
                      <TableRow key={stat.actionType}>
                        <TableCell className="font-medium">{stat.actionType}</TableCell>
                        <TableCell>{stat.count}</TableCell>
                        <TableCell>{stat.totalCredits}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.fullName}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.role}</TableCell>
                        <TableCell>{user.credits}</TableCell>
                        <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="credits">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Add Credits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="user">Select User</Label>
                      <select
                        id="user"
                        className="w-full p-2 border rounded-md"
                        value={selectedUser?.id || ""}
                        onChange={(e) => {
                          const userId = e.target.value
                          const user = users.find((u) => u.id.toString() === userId)
                          setSelectedUser(user || null)
                        }}
                      >
                        <option value="">Select a user</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.fullName} ({user.email})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="credits">Credits Amount</Label>
                      <Input
                        id="credits"
                        type="number"
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(Number.parseInt(e.target.value) || 0)}
                        min="1"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        value={creditDescription}
                        onChange={(e) => setCreditDescription(e.target.value)}
                        placeholder="Reason for adding credits"
                      />
                    </div>

                    <Button
                      onClick={handleAddCredits}
                      disabled={!selectedUser || creditAmount <= 0 || isAddingCredits}
                      className="w-full bg-gradient-green text-white"
                    >
                      {isAddingCredits ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding Credits...
                        </>
                      ) : (
                        "Add Credits"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>User Credits</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Credits</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.fullName}</TableCell>
                          <TableCell>{user.credits}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user)
                                setCreditAmount(100)
                                setCreditDescription("")
                              }}
                            >
                              Add Credits
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
