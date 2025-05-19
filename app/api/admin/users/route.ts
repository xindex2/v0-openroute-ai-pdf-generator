import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getAllUsers, getUserCount, updateUserCredits } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    await requireAdmin(request)

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const limit = Number.parseInt(searchParams.get("limit") || "100", 10)
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10)

    // Get users
    const users = await getAllUsers(limit, offset)
    const totalUsers = await getUserCount()

    // Format user data
    const formattedUsers = users.map((user) => ({
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      avatarUrl: user.avatar_url,
      credits: user.credits,
      role: user.role,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }))

    return NextResponse.json({
      users: formattedUsers,
      total: totalUsers,
    })
  } catch (error) {
    console.error("Admin users error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to get users" }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    await requireAdmin(request)

    // Get request body
    const { userId, credits, description } = await request.json()

    if (!userId || !credits || credits <= 0) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
    }

    // Add credits to user
    const newCredits = await updateUserCredits(userId, credits, description || `Admin added ${credits} credits`, "add")

    return NextResponse.json({
      userId,
      credits: newCredits,
    })
  } catch (error) {
    console.error("Admin add credits error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to add credits" },
      { status: 401 },
    )
  }
}
