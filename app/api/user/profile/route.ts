import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { updateUserProfile } from "@/lib/db"

export async function PATCH(request: NextRequest) {
  try {
    // Verify authentication
    const authUser = await requireAuth(request)

    // Get request body
    const { fullName, avatarUrl } = await request.json()

    // Update user profile
    const updatedUser = await updateUserProfile(authUser.id, { fullName, avatarUrl })

    if (!updatedUser) {
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
    }

    // Return updated user data
    return NextResponse.json({
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.full_name,
        avatarUrl: updatedUser.avatar_url,
        credits: updatedUser.credits,
        role: updatedUser.role,
      },
    })
  } catch (error) {
    console.error("Profile update error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update profile" },
      { status: 401 },
    )
  }
}
