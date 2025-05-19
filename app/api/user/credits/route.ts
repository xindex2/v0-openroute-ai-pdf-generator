import { type NextRequest, NextResponse } from "next/server"
import { requireAuth, requireAdmin } from "@/lib/auth"
import { getUserCredits, updateUserCredits, getCreditTransactions } from "@/lib/db"

// Get user credits and transactions
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const credits = await getUserCredits(user.id)
    const transactions = await getCreditTransactions(user.id)

    return NextResponse.json({
      credits,
      transactions: transactions.map((t) => ({
        id: t.id,
        amount: t.amount,
        description: t.description,
        type: t.transaction_type,
        createdAt: t.created_at,
      })),
    })
  } catch (error) {
    console.error("Get credits error:", error)

    if (error instanceof Error && error.message === "Not authenticated") {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    return NextResponse.json({ error: "Failed to get credits" }, { status: 500 })
  }
}

// Admin endpoint to add credits to a user
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()

    const { userId, amount, description } = await request.json()

    if (!userId || !amount || amount <= 0 || !description) {
      return NextResponse.json({ error: "User ID, amount, and description are required" }, { status: 400 })
    }

    const newCredits = await updateUserCredits(userId, amount, description, "add")

    return NextResponse.json({
      success: true,
      credits: newCredits,
    })
  } catch (error) {
    console.error("Add credits error:", error)

    if (error instanceof Error) {
      if (error.message === "Not authenticated") {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
      }

      if (error.message === "Not authorized") {
        return NextResponse.json({ error: "Not authorized" }, { status: 403 })
      }
    }

    return NextResponse.json({ error: "Failed to add credits" }, { status: 500 })
  }
}
