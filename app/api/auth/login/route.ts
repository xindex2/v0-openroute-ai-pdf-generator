import { NextResponse } from "next/server"
import { getUserByEmail, comparePasswords } from "@/lib/memory-db"
import { generateToken } from "@/lib/auth"
import { cookies } from "next/headers"

export async function POST(request: Request) {
  console.log("Login API route called")

  try {
    // Parse request body
    let body
    try {
      body = await request.json()
      console.log("Request body parsed:", { email: body.email, passwordProvided: !!body.password })
    } catch (error) {
      console.error("Failed to parse request body:", error)
      return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 })
    }

    const { email, password } = body

    // Validate input
    if (!email || !password) {
      console.log("Missing required fields")
      return NextResponse.json({ success: false, error: "Email and password are required" }, { status: 400 })
    }

    // Get user by email
    console.log("Looking up user:", email)
    const user = await getUserByEmail(email)
    if (!user) {
      console.log("User not found")
      return NextResponse.json({ success: false, error: "Invalid email or password" }, { status: 401 })
    }

    // Verify password
    console.log("Verifying password")
    const passwordValid = await comparePasswords(password, user.password_hash)
    if (!passwordValid) {
      console.log("Invalid password")
      return NextResponse.json({ success: false, error: "Invalid email or password" }, { status: 401 })
    }

    // Generate JWT token
    console.log("Generating token")
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    })

    // Set cookie
    console.log("Setting auth cookie")
    cookies().set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 1 week
    })

    // Return user data (without password)
    console.log("Returning user data")
    return NextResponse.json({
      success: true,
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
      {
        success: false,
        error: "An error occurred during login: " + (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 },
    )
  }
}
