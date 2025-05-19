import { type NextRequest, NextResponse } from "next/server"
import { createUser, getUserByEmail } from "@/lib/db"
import { cookies } from "next/headers"
import { sign } from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key"

export async function POST(request: NextRequest) {
  console.log("Register API route called")

  try {
    // Parse request body
    const body = await request.json()
    console.log("Request body:", body)

    const { email, password, fullName } = body

    // Validate input
    if (!email || !password || !fullName) {
      console.log("Missing required fields")
      return NextResponse.json({ error: "Email, password, and full name are required" }, { status: 400 })
    }

    // Check if user already exists
    console.log("Checking if user exists")
    const existingUser = getUserByEmail(email)
    if (existingUser) {
      console.log("User already exists")
      return NextResponse.json({ error: "User with this email already exists" }, { status: 409 })
    }

    // Create new user
    console.log("Creating new user")
    const user = await createUser(email, password, fullName)
    console.log("User created:", user)

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
        credits: user.credits,
        role: user.role,
      },
    })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Failed to register user: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 },
    )
  }
}
