import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET() {
  try {
    // Use the same connection string as in db.ts
    const DATABASE_URL =
      "postgres://neondb_owner:npg_OYi1e5oECHRB@ep-weathered-dew-a4gzhtwk-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"

    const sql = neon(DATABASE_URL)

    // Try a simple query
    const result = await sql`SELECT NOW() as time`

    return NextResponse.json({
      success: true,
      message: "Database connection successful",
      time: result[0]?.time,
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
