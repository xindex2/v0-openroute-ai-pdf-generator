import { type NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { verify } from "jsonwebtoken"
import { getUserById } from "@/lib/db"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export async function GET(request: NextRequest) {
  try {
    // Get the token from cookies
    const token = cookies().get("auth_token")?.value

    if (!token) {
      return NextResponse.json({ user: null })
    }

    // Verify the token
    const decoded = verify(token, JWT_SECRET) as { id: number; email: string; role: string }

    // Get user from database
    const user = getUserById(decoded.id)

    if (!user) {
      return NextResponse.json({ user: null })
    }

    // Return user data (without password)
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        credits: user.credits,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Auth error:", error)
    return NextResponse.json({ user: null })
  }
}
