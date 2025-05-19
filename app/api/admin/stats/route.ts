import { type NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getUsageStats, getUserCount } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    await requireAdmin(request)

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const days = Number.parseInt(searchParams.get("days") || "30", 10)

    // Get usage stats
    const stats = await getUsageStats(days)
    const totalUsers = await getUserCount()

    // Calculate summary
    let totalUsage = 0
    let totalCredits = 0

    stats.forEach((stat: any) => {
      totalUsage += Number.parseInt(stat.count, 10)
      totalCredits += Number.parseInt(stat.total_credits, 10)
    })

    // Format stats
    const formattedStats = stats.map((stat: any) => ({
      actionType: stat.action_type,
      count: Number.parseInt(stat.count, 10),
      totalCredits: Number.parseInt(stat.total_credits, 10),
    }))

    return NextResponse.json({
      stats: formattedStats,
      summary: {
        totalUsers,
        totalUsage,
        totalCredits,
      },
    })
  } catch (error) {
    console.error("Admin stats error:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to get stats" }, { status: 401 })
  }
}
