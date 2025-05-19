import { NextResponse } from "next/server"
import { getUserByEmail, initDb } from "@/lib/memory-db"

export async function GET() {
  try {
    console.log("Testing in-memory database")

    // Initialize the database
    await initDb()

    // Try to get the admin user
    const adminUser = await getUserByEmail("admin@example.com")

    return NextResponse.json({
      success: true,
      message: "In-memory database connection successful",
      adminUser: adminUser
        ? {
            id: adminUser.id,
            email: adminUser.email,
            fullName: adminUser.full_name,
            role: adminUser.role,
            credits: adminUser.credits,
          }
        : null,
    })
  } catch (error) {
    console.error("Database test error:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
