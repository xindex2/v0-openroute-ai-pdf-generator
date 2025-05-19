import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import bcrypt from "bcryptjs"

export async function GET() {
  try {
    // Hardcode the connection string directly
    const connectionString =
      "postgres://neondb_owner:npg_OYi1e5oECHRB@ep-weathered-dew-a4gzhtwk-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"

    console.log("Connecting to database to create test user")

    const sql = neon(connectionString)

    // Hash password
    const password = "password123"
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create test user
    const result = await sql`
      INSERT INTO users (email, password_hash, full_name, credits, role)
      VALUES (
        'test@example.com', 
        ${hashedPassword}, 
        'Test User', 
        100, 
        'user'
      )
      ON CONFLICT (email) 
      DO UPDATE SET 
        password_hash = ${hashedPassword},
        full_name = 'Test User',
        credits = 100
      RETURNING id, email, full_name, credits, role
    `

    return NextResponse.json({
      success: true,
      message: "Test user created successfully",
      user: {
        id: result[0].id,
        email: result[0].email,
        fullName: result[0].full_name,
        credits: result[0].credits,
        role: result[0].role,
      },
      credentials: {
        email: "test@example.com",
        password: "password123",
      },
    })
  } catch (error) {
    console.error("Error creating test user:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
