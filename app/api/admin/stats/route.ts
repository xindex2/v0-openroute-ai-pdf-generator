import { NextResponse } from "next/server"
import { verifyAuth } from "@/lib/auth"
import { getUserCount, getUsageStats } from "@/lib/memory-db"

export async function GET(request: Request) {
  try {
    // Verify authentication
    const auth = await verifyAuth()

    if (!auth.success) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 })
    }

    // Check if user is admin
    if (auth.user.role !== "admin") {
      return NextResponse.json({ success: false, error: "Not authorized" }, { status: 403 })
    }

    // Get stats
    const userCount = await getUserCount()
    const usageStats = await getUsageStats()

    return NextResponse.json({
      success: true,
      stats: {
        userCount,
        usageStats,
      },
    })
  } catch (error) {
    console.error("Get stats error:", error)
    return NextResponse.json({ success: false, error: "An error occurred while getting stats" }, { status: 500 })
  }
}
