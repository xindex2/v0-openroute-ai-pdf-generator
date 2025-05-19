import initSqlJs from "sql.js"
import bcrypt from "bcryptjs"
import { v4 as uuidv4 } from "uuid"

// SQLite database instance
let db: any = null
let initialized = false

// Initialize SQL.js
async function initDb() {
  if (db) return db

  try {
    console.log("Initializing SQL.js database")
    const SQL = await initSqlJs()

    // Create a new database in memory
    db = new SQL.Database()

    // Initialize schema
    await initializeSchema()

    // Create admin user
    await createAdminUserIfNotExists()

    initialized = true
    console.log("SQL.js database initialized successfully")
    return db
  } catch (error) {
    console.error("Error initializing SQL.js database:", error)
    throw error
  }
}

// Initialize database schema
async function initializeSchema() {
  if (!db) await initDb()

  // Create users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      avatar_url TEXT,
      credits INTEGER DEFAULT 100,
      role TEXT DEFAULT 'user',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Create documents table
  db.exec(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      user_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  // Create document_versions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS document_versions (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      content TEXT NOT NULL,
      version_number INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      UNIQUE(document_id, version_number)
    )
  `)

  // Create missing_fields table
  db.exec(`
    CREATE TABLE IF NOT EXISTS missing_fields (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      field_name TEXT NOT NULL,
      field_value TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
      UNIQUE(document_id, field_name)
    )
  `)

  // Create credit_transactions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS credit_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      description TEXT NOT NULL,
      transaction_type TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)

  // Create usage_logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      document_id TEXT,
      credits_used INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
    )
  `)

  console.log("Database schema initialized")
}

// Helper function to run a query and return results
function runQuery(query: string, params: any[] = []): any[] {
  if (!db) throw new Error("Database not initialized")

  const stmt = db.prepare(query)
  stmt.bind(params)

  const results = []
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()

  return results
}

// Helper function to run a query and return a single result
function runQuerySingle(query: string, params: any[] = []): any {
  const results = runQuery(query, params)
  return results.length > 0 ? results[0] : null
}

// Helper function to execute a query without returning results
function execQuery(query: string, params: any[] = []): void {
  if (!db) throw new Error("Database not initialized")

  const stmt = db.prepare(query)
  stmt.bind(params)
  stmt.step()
  stmt.free()
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

// Create admin user if it doesn't exist
async function createAdminUserIfNotExists() {
  try {
    const adminUser = await getUserByEmail("admin@example.com")

    if (!adminUser) {
      console.log("Creating admin user")
      const hashedPassword = "$2a$10$mLK.rrdlvx9DCFb6Eck1t.TlltnGulepXnov3bBp5T2TloO1MYj52" // admin123

      execQuery(
        `INSERT INTO users (email, password_hash, full_name, credits, role)
         VALUES (?, ?, ?, 1000, 'admin')`,
        ["admin@example.com", hashedPassword, "Admin User"],
      )

      console.log("Admin user created")
    } else {
      console.log("Admin user already exists")
    }
  } catch (error) {
    console.error("Error creating admin user:", error)
  }
}

// User management
export async function createUser(email: string, password: string, fullName: string) {
  await initDb()
  console.log(`Creating user with email: ${email}`)

  try {
    const hashedPassword = await hashPassword(password)

    execQuery(
      `INSERT INTO users (email, password_hash, full_name, credits, role)
       VALUES (?, ?, ?, 100, 'user')`,
      [email, hashedPassword, fullName],
    )

    const user = runQuerySingle(
      `SELECT id, email, full_name, credits, role, created_at
       FROM users
       WHERE email = ?`,
      [email],
    )

    console.log("User created successfully:", user)
    return user
  } catch (error) {
    console.error("Error creating user:", error)
    throw error
  }
}

export async function getUserByEmail(email: string) {
  await initDb()
  console.log(`Looking up user with email: ${email}`)

  try {
    const user = runQuerySingle(
      `SELECT id, email, password_hash, full_name, avatar_url, credits, role, created_at, updated_at
       FROM users
       WHERE email = ?`,
      [email],
    )

    console.log("User lookup result:", user ? "User found" : "User not found")
    return user
  } catch (error) {
    console.error("Error looking up user:", error)
    throw error
  }
}

export async function getUserById(id: number) {
  await initDb()
  console.log(`Looking up user with id: ${id}`)

  try {
    const user = runQuerySingle(
      `SELECT id, email, full_name, avatar_url, credits, role, created_at, updated_at
       FROM users
       WHERE id = ?`,
      [id],
    )

    console.log("User lookup result:", user ? "User found" : "User not found")
    return user
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
    let query = "UPDATE users SET "
    const params = []

    if (fullName) {
      query += "full_name = ?"
      params.push(fullName)
    }

    if (avatarUrl) {
      if (fullName) query += ", "
      query += "avatar_url = ?"
      params.push(avatarUrl)
    }

    query += ", updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    params.push(userId)

    execQuery(query, params)

    return runQuerySingle(
      `SELECT id, email, full_name, avatar_url, credits, role
       FROM users
       WHERE id = ?`,
      [userId],
    )
  } catch (error) {
    console.error("Error updating user profile:", error)
    throw error
  }
}

// Document management
export async function getDocumentsByUserId(userId: number) {
  await initDb()

  try {
    return runQuery(
      `SELECT id, title, user_id, created_at, updated_at
       FROM documents
       WHERE user_id = ?
       ORDER BY updated_at DESC`,
      [userId],
    )
  } catch (error) {
    console.error("Error getting documents:", error)
    throw error
  }
}

export async function createDocument(userId: number, title: string, content: string) {
  await initDb()

  try {
    const id = generateId()
    const timestamp = new Date().toISOString()

    execQuery(
      `INSERT INTO documents (id, title, content, user_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, title, content, userId, timestamp, timestamp],
    )

    return runQuerySingle(
      `SELECT id, title, user_id, created_at, updated_at
       FROM documents
       WHERE id = ?`,
      [id],
    )
  } catch (error) {
    console.error("Error creating document:", error)
    throw error
  }
}

export async function getDocumentById(id: string, userId: number) {
  await initDb()

  try {
    return runQuerySingle(
      `SELECT id, title, content, user_id, created_at, updated_at
       FROM documents
       WHERE id = ? AND user_id = ?`,
      [id, userId],
    )
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
    let query = "UPDATE documents SET "
    const params = []

    if (title) {
      query += "title = ?"
      params.push(title)
    }

    if (content) {
      if (title) query += ", "
      query += "content = ?"
      params.push(content)
    }

    query += ", updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?"
    params.push(id, userId)

    execQuery(query, params)

    return runQuerySingle(
      `SELECT id, title, content, user_id, created_at, updated_at
       FROM documents
       WHERE id = ?`,
      [id],
    )
  } catch (error) {
    console.error("Error updating document:", error)
    throw error
  }
}

export async function deleteDocument(id: string, userId: number) {
  await initDb()

  try {
    execQuery(
      `DELETE FROM documents
       WHERE id = ? AND user_id = ?`,
      [id, userId],
    )

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
    return runQuery(
      `SELECT id, document_id, content, version_number, created_at
       FROM document_versions
       WHERE document_id = ?
       ORDER BY version_number ASC`,
      [documentId],
    )
  } catch (error) {
    console.error("Error getting document versions:", error)
    throw error
  }
}

export async function createDocumentVersion(documentId: string, content: string, versionNumber: number) {
  await initDb()

  try {
    const id = generateId()
    const timestamp = new Date().toISOString()

    execQuery(
      `INSERT INTO document_versions (id, document_id, content, version_number, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [id, documentId, content, versionNumber, timestamp],
    )

    return runQuerySingle(
      `SELECT id, document_id, content, version_number, created_at
       FROM document_versions
       WHERE id = ?`,
      [id],
    )
  } catch (error) {
    console.error("Error creating document version:", error)
    throw error
  }
}

// Missing fields
export async function getMissingFields(documentId: string) {
  await initDb()

  try {
    return runQuery(
      `SELECT id, document_id, field_name, field_value, created_at, updated_at
       FROM missing_fields
       WHERE document_id = ?`,
      [documentId],
    )
  } catch (error) {
    console.error("Error getting missing fields:", error)
    throw error
  }
}

export async function updateMissingField(id: string, value: string) {
  await initDb()

  try {
    execQuery(
      `UPDATE missing_fields
       SET field_value = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [value, id],
    )

    return runQuerySingle(
      `SELECT id, document_id, field_name, field_value, updated_at
       FROM missing_fields
       WHERE id = ?`,
      [id],
    )
  } catch (error) {
    console.error("Error updating missing field:", error)
    throw error
  }
}

// Credit management
export async function getUserCredits(userId: number) {
  await initDb()

  try {
    const result = runQuerySingle(
      `SELECT credits
       FROM users
       WHERE id = ?`,
      [userId],
    )
    return result?.credits || 0
  } catch (error) {
    console.error("Error getting user credits:", error)
    throw error
  }
}

export async function updateUserCredits(userId: number, amount: number, description: string, type: "add" | "subtract") {
  await initDb()

  try {
    // Update user credits
    execQuery(
      `UPDATE users
       SET credits = credits ${type === "add" ? "+" : "-"} ?
       WHERE id = ?`,
      [amount, userId],
    )

    // Record the transaction
    const timestamp = new Date().toISOString()
    execQuery(
      `INSERT INTO credit_transactions (user_id, amount, description, transaction_type, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, amount, description, type, timestamp],
    )

    const result = runQuerySingle(
      `SELECT credits
       FROM users
       WHERE id = ?`,
      [userId],
    )

    return result?.credits || 0
  } catch (error) {
    console.error("Error updating user credits:", error)
    throw error
  }
}

export async function logUsage(userId: number, actionType: string, documentId: string | null, creditsUsed: number) {
  await initDb()

  try {
    // Log usage
    const timestamp = new Date().toISOString()
    execQuery(
      `INSERT INTO usage_logs (user_id, action_type, document_id, credits_used, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, actionType, documentId, creditsUsed, timestamp],
    )

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
    return runQuery(
      `SELECT id, email, full_name, avatar_url, credits, role, created_at, updated_at
       FROM users
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset],
    )
  } catch (error) {
    console.error("Error getting all users:", error)
    throw error
  }
}

export async function getUserCount() {
  await initDb()

  try {
    const result = runQuerySingle(`SELECT COUNT(*) as count FROM users`)
    return result?.count || 0
  } catch (error) {
    console.error("Error getting user count:", error)
    throw error
  }
}

export async function getUsageStats(days = 30) {
  await initDb()

  try {
    // In SQL.js, we don't have the datetime function, so we'll just return all stats
    return runQuery(
      `SELECT 
         action_type, 
         COUNT(*) as count, 
         SUM(credits_used) as total_credits
       FROM usage_logs
       GROUP BY action_type
       ORDER BY total_credits DESC`,
    )
  } catch (error) {
    console.error("Error getting usage stats:", error)
    throw error
  }
}

export async function getUserUsageStats(userId: number, days = 30) {
  await initDb()

  try {
    // In SQL.js, we don't have the datetime function, so we'll just filter by user_id
    return runQuery(
      `SELECT 
         action_type, 
         COUNT(*) as count, 
         SUM(credits_used) as total_credits
       FROM usage_logs
       WHERE user_id = ?
       GROUP BY action_type
       ORDER BY total_credits DESC`,
      [userId],
    )
  } catch (error) {
    console.error("Error getting user usage stats:", error)
    throw error
  }
}

export async function getCreditTransactions(userId: number, limit = 20) {
  await initDb()

  try {
    return runQuery(
      `SELECT id, amount, description, transaction_type, created_at
       FROM credit_transactions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [userId, limit],
    )
  } catch (error) {
    console.error("Error getting credit transactions:", error)
    throw error
  }
}

// Initialize the database when this module is imported
initDb().catch((error) => {
  console.error("Failed to initialize database:", error)
})
