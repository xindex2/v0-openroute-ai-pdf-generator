import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth"
import { getUsageStats, getUserCount } from "@/lib/db"

export async function GET() {
  try {
    // Verify admin authentication
    await requireAdmin()

    // Get usage stats
    const stats = await getUsageStats(30)
    const totalUsers = await getUserCount()

    // Calculate summary
    let totalUsage = 0
    let totalCredits = 0

    stats.forEach((stat: any) => {
      totalUsage += Number(stat.count)
      totalCredits += Number(stat.total_credits)
    })

    // Format stats
    const formattedStats = stats.map((stat: any) => ({
      actionType: stat.action_type,
      count: Number(stat.count),
      totalCredits: Number(stat.total_credits),
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
