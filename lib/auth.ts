import { cookies } from "next/headers"
import { verify } from "jsonwebtoken"
import { getUserById } from "@/lib/db"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export async function getAuthUser() {
  try {
    // Get the token from cookies
    const token = cookies().get("auth_token")?.value

    if (!token) {
      return null
    }

    // Verify the token
    const decoded = verify(token, JWT_SECRET) as { id: number; email: string; role: string }

    // Get user from database
    const user = getUserById(decoded.id)

    if (!user) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      avatarUrl: user.avatar_url,
      credits: user.credits,
      role: user.role,
    }
  } catch (error) {
    console.error("Auth error:", error)
    return null
  }
}

export async function requireAuth() {
  const user = await getAuthUser()

  if (!user) {
    throw new Error("Not authenticated")
  }

  return user
}

export async function requireAdmin() {
  const user = await requireAuth()

  if (user.role !== "admin") {
    throw new Error("Not authorized")
  }

  return user
}
