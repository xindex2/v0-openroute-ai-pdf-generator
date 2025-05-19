import jwt from "jsonwebtoken"
import { cookies } from "next/headers"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

// User payload for JWT
interface UserPayload {
  id: number
  email: string
  role: string
}

// Generate JWT token
export function generateToken(user: UserPayload): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "7d" })
}

// Verify JWT token
export function verifyToken(token: string): UserPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserPayload
  } catch (error) {
    console.error("Token verification error:", error)
    return null
  }
}

// Verify authentication from cookies
export async function verifyAuth() {
  try {
    // Get token from cookies
    const token = cookies().get("auth_token")?.value

    if (!token) {
      return { success: false, error: "No authentication token" }
    }

    // Verify token
    const user = verifyToken(token)
    if (!user) {
      return { success: false, error: "Invalid authentication token" }
    }

    return { success: true, user }
  } catch (error) {
    console.error("Authentication error:", error)
    return { success: false, error: "Authentication error" }
  }
}

// Middleware to require authentication
export async function requireAuth() {
  const authResult = await verifyAuth()

  if (!authResult.success) {
    throw new Error("Not authenticated")
  }

  return authResult.user
}

// Middleware to require admin role
export async function requireAdmin() {
  const authResult = await verifyAuth()

  if (!authResult.success) {
    throw new Error("Not authenticated")
  }

  if (authResult.user.role !== "admin") {
    throw new Error("Not authorized")
  }

  return authResult.user
}
