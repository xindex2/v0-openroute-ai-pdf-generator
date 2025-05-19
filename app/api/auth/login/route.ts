import { type NextRequest, NextResponse } from "next/server"
import { getUserByEmail, comparePasswords } from "@/lib/db"
import { cookies } from "next/headers"
import { sign } from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export async function POST(request: NextRequest) {
  console.log("Login API route called")

  try {
    // Parse request body
    let body
    try {
      body = await request.json()
      console.log("Request body parsed:", { email: body.email, passwordProvided: !!body.password })
    } catch (error) {
      console.error("Failed to parse request body:", error)
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    }

    const { email, password } = body

    // Validate input
    if (!email || !password) {
      console.log("Missing required fields")
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Find user
    console.log("Looking up user")
    const user = getUserByEmail(email)
    if (!user) {
      console.log("User not found")
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    // Verify password
    console.log("Verifying password")
    const isPasswordValid = await comparePasswords(password, user.password_hash)
    if (!isPasswordValid) {
      console.log("Invalid password")
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    // Create JWT token
    console.log("Creating JWT token")
    const token = sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    )

    // Set cookie
    console.log("Setting auth cookie")
    cookies().set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    })

    // Return user data (without password)
    console.log("Returning user data")
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
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "Failed to log in: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 },
    )
  }
}
