import bcrypt from "bcryptjs"
import { v4 as uuidv4 } from "uuid"

// In-memory database
const db: {
  users: any[]
  documents: any[]
  documentVersions: any[]
  missingFields: any[]
  creditTransactions: any[]
  usageLogs: any[]
} = {
  users: [],
  documents: [],
  documentVersions: [],
  missingFields: [],
  creditTransactions: [],
  usageLogs: [],
}

// Initialize with admin user
let initialized = false

// Helper function to get current timestamp
function now() {
  return new Date().toISOString()
}

// Initialize database
export async function initDb() {
  if (initialized) return

  console.log("Initializing in-memory database")

  // Create admin user if it doesn't exist
  const adminExists = db.users.some((user) => user.email === "admin@example.com")

  if (!adminExists) {
    console.log("Creating admin user")
    const hashedPassword = "$2a$10$mLK.rrdlvx9DCFb6Eck1t.TlltnGulepXnov3bBp5T2TloO1MYj52" // admin123

    db.users.push({
      id: 1,
      email: "admin@example.com",
      password_hash: hashedPassword,
      full_name: "Admin User",
      avatar_url: null,
      credits: 1000,
      role: "admin",
      created_at: now(),
      updated_at: now(),
    })

    console.log("Admin user created")
  }

  initialized = true
  console.log("In-memory database initialized")
}

// User authentication helpers
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function comparePasswords(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// Generate a UUID
export function generateId(): string {
  return uuidv4()
}

// User management
export async function createUser(email: string, password: string, fullName: string) {
  await initDb()
  console.log(`Creating user with email: ${email}`)

  // Check if user already exists
  const existingUser = db.users.find((user) => user.email === email)
  if (existingUser) {
    throw new Error("User with this email already exists")
  }

  try {
    const hashedPassword = await hashPassword(password)
    const id = db.users.length + 1

    const user = {
      id,
      email,
      password_hash: hashedPassword,
      full_name: fullName,
      avatar_url: null,
      credits: 100,
      role: "user",
      created_at: now(),
      updated_at: now(),
    }

    db.users.push(user)

    // Return user without password
    const { password_hash, ...userWithoutPassword } = user
    console.log("User created successfully:", userWithoutPassword)
    return userWithoutPassword
  } catch (error) {
    console.error("Error creating user:", error)
    throw error
  }
}

export async function getUserByEmail(email: string) {
  await initDb()
  console.log(`Looking up user with email: ${email}`)

  try {
    const user = db.users.find((user) => user.email === email)
    console.log("User lookup result:", user ? "User found" : "User not found")
    return user || null
  } catch (error) {
    console.error("Error looking up user:", error)
    throw error
  }
}

export async function getUserById(id: number) {
  await initDb()
  console.log(`Looking up user with id: ${id}`)

  try {
    const user = db.users.find((user) => user.id === id)
    console.log("User lookup result:", user ? "User found" : "User not found")
    return user || null
  } catch (error) {
    console.error("Error looking up user:", error)
    throw error
  }
}

export async function updateUserProfile(userId: number, data: { fullName?: string; avatarUrl?: string }) {
  await initDb()
  const { fullName, avatarUrl } = data

  if (!fullName && !avatarUrl) return null

  try {
    const userIndex = db.users.findIndex((user) => user.id === userId)
    if (userIndex === -1) return null

    const user = db.users[userIndex]

    if (fullName) user.full_name = fullName
    if (avatarUrl) user.avatar_url = avatarUrl
    user.updated_at = now()

    // Return user without password
    const { password_hash, ...userWithoutPassword } = user
    return userWithoutPassword
  } catch (error) {
    console.error("Error updating user profile:", error)
    throw error
  }
}

// Document management
export async function getDocumentsByUserId(userId: number) {
  await initDb()

  try {
    return db.documents
      .filter((doc) => doc.user_id === userId)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  } catch (error) {
    console.error("Error getting documents:", error)
    throw error
  }
}

export async function createDocument(userId: number, title: string, content: string) {
  await initDb()

  try {
    const id = generateId()
    const timestamp = now()

    const document = {
      id,
      title,
      content,
      user_id: userId,
      created_at: timestamp,
      updated_at: timestamp,
    }

    db.documents.push(document)
    return document
  } catch (error) {
    console.error("Error creating document:", error)
    throw error
  }
}

export async function getDocumentById(id: string, userId: number) {
  await initDb()

  try {
    return db.documents.find((doc) => doc.id === id && doc.user_id === userId) || null
  } catch (error) {
    console.error("Error getting document:", error)
    throw error
  }
}

export async function updateDocument(id: string, userId: number, data: { title?: string; content?: string }) {
  await initDb()
  const { title, content } = data

  if (!title && !content) return null

  try {
    const docIndex = db.documents.findIndex((doc) => doc.id === id && doc.user_id === userId)
    if (docIndex === -1) return null

    const document = db.documents[docIndex]

    if (title) document.title = title
    if (content) document.content = content
    document.updated_at = now()

    return document
  } catch (error) {
    console.error("Error updating document:", error)
    throw error
  }
}

export async function deleteDocument(id: string, userId: number) {
  await initDb()

  try {
    const docIndex = db.documents.findIndex((doc) => doc.id === id && doc.user_id === userId)
    if (docIndex === -1) return null

    db.documents.splice(docIndex, 1)
    return { id }
  } catch (error) {
    console.error("Error deleting document:", error)
    throw error
  }
}

// Document versions
export async function getDocumentVersions(documentId: string) {
  await initDb()

  try {
    return db.documentVersions
      .filter((version) => version.document_id === documentId)
      .sort((a, b) => a.version_number - b.version_number)
  } catch (error) {
    console.error("Error getting document versions:", error)
    throw error
  }
}

export async function createDocumentVersion(documentId: string, content: string, versionNumber: number) {
  await initDb()

  try {
    const id = generateId()
    const timestamp = now()

    const version = {
      id,
      document_id: documentId,
      content,
      version_number: versionNumber,
      created_at: timestamp,
    }

    db.documentVersions.push(version)
    return version
  } catch (error) {
    console.error("Error creating document version:", error)
    throw error
  }
}

// Missing fields
export async function getMissingFields(documentId: string) {
  await initDb()

  try {
    return db.missingFields.filter((field) => field.document_id === documentId)
  } catch (error) {
    console.error("Error getting missing fields:", error)
    throw error
  }
}

export async function updateMissingField(id: string, value: string) {
  await initDb()

  try {
    const fieldIndex = db.missingFields.findIndex((field) => field.id === id)
    if (fieldIndex === -1) return null

    const field = db.missingFields[fieldIndex]
    field.field_value = value
    field.updated_at = now()

    return field
  } catch (error) {
    console.error("Error updating missing field:", error)
    throw error
  }
}

// Credit management
export async function getUserCredits(userId: number) {
  await initDb()

  try {
    const user = db.users.find((user) => user.id === userId)
    return user?.credits || 0
  } catch (error) {
    console.error("Error getting user credits:", error)
    throw error
  }
}

export async function updateUserCredits(userId: number, amount: number, description: string, type: "add" | "subtract") {
  await initDb()

  try {
    // Update user credits
    const userIndex = db.users.findIndex((user) => user.id === userId)
    if (userIndex === -1) return 0

    const user = db.users[userIndex]
    if (type === "add") {
      user.credits += amount
    } else {
      user.credits -= amount
    }

    // Record the transaction
    const transaction = {
      id: db.creditTransactions.length + 1,
      user_id: userId,
      amount,
      description,
      transaction_type: type,
      created_at: now(),
    }

    db.creditTransactions.push(transaction)
    return user.credits
  } catch (error) {
    console.error("Error updating user credits:", error)
    throw error
  }
}

export async function logUsage(userId: number, actionType: string, documentId: string | null, creditsUsed: number) {
  await initDb()

  try {
    // Log usage
    const usage = {
      id: db.usageLogs.length + 1,
      user_id: userId,
      action_type: actionType,
      document_id: documentId,
      credits_used: creditsUsed,
      created_at: now(),
    }

    db.usageLogs.push(usage)

    // Subtract credits from user if needed
    if (creditsUsed > 0) {
      await updateUserCredits(userId, creditsUsed, `Used ${creditsUsed} credits for ${actionType}`, "subtract")
    }
  } catch (error) {
    console.error("Error logging usage:", error)
    throw error
  }
}

// Admin functions
export async function getAllUsers(limit = 100, offset = 0) {
  await initDb()

  try {
    return db.users
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(offset, offset + limit)
      .map((user) => {
        // Remove password hash
        const { password_hash, ...userWithoutPassword } = user
        return userWithoutPassword
      })
  } catch (error) {
    console.error("Error getting all users:", error)
    throw error
  }
}

export async function getUserCount() {
  await initDb()

  try {
    return db.users.length
  } catch (error) {
    console.error("Error getting user count:", error)
    throw error
  }
}

export async function getUsageStats(days = 30) {
  await initDb()

  try {
    // Group by action_type
    const stats: Record<string, { count: number; total_credits: number }> = {}

    db.usageLogs.forEach((log) => {
      if (!stats[log.action_type]) {
        stats[log.action_type] = { count: 0, total_credits: 0 }
      }
      stats[log.action_type].count++
      stats[log.action_type].total_credits += log.credits_used
    })

    // Convert to array
    return Object.entries(stats).map(([action_type, { count, total_credits }]) => ({
      action_type,
      count,
      total_credits,
    }))
  } catch (error) {
    console.error("Error getting usage stats:", error)
    throw error
  }
}

export async function getUserUsageStats(userId: number, days = 30) {
  await initDb()

  try {
    // Group by action_type
    const stats: Record<string, { count: number; total_credits: number }> = {}

    db.usageLogs
      .filter((log) => log.user_id === userId)
      .forEach((log) => {
        if (!stats[log.action_type]) {
          stats[log.action_type] = { count: 0, total_credits: 0 }
        }
        stats[log.action_type].count++
        stats[log.action_type].total_credits += log.credits_used
      })

    // Convert to array
    return Object.entries(stats).map(([action_type, { count, total_credits }]) => ({
      action_type,
      count,
      total_credits,
    }))
  } catch (error) {
    console.error("Error getting user usage stats:", error)
    throw error
  }
}

export async function getCreditTransactions(userId: number, limit = 20) {
  await initDb()

  try {
    return db.creditTransactions
      .filter((transaction) => transaction.user_id === userId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit)
  } catch (error) {
    console.error("Error getting credit transactions:", error)
    throw error
  }
}

// Initialize the database when this module is imported
initDb().catch((error) => {
  console.error("Failed to initialize database:", error)
})
