import { Database } from "better-sqlite3"
import bcrypt from "bcryptjs"
import fs from "fs"
import path from "path"

// Ensure the data directory exists
const DATA_DIR = path.join(process.cwd(), "data")
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

// Initialize SQLite database
const DB_PATH = path.join(DATA_DIR, "database.sqlite")
console.log(`Initializing SQLite database at: ${DB_PATH}`)

let db: Database

// This is a workaround for Next.js hot reloading
// We don't want to create multiple database connections
declare global {
  var _db: Database | undefined
}

if (process.env.NODE_ENV === "development") {
  if (!global._db) {
    global._db = new Database(DB_PATH)
    global._db.pragma("journal_mode = WAL")
    global._db.pragma("foreign_keys = ON")
  }
  db = global._db
} else {
  db = new Database(DB_PATH)
  db.pragma("journal_mode = WAL")
  db.pragma("foreign_keys = ON")
}

// Initialize database schema
export function initializeDatabase() {
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

  // Create triggers for updated_at
  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_users_updated_at
    AFTER UPDATE ON users
    FOR EACH ROW
    BEGIN
      UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `)

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_documents_updated_at
    AFTER UPDATE ON documents
    FOR EACH ROW
    BEGIN
      UPDATE documents SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `)

  db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_missing_fields_updated_at
    AFTER UPDATE ON missing_fields
    FOR EACH ROW
    BEGIN
      UPDATE missing_fields SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `)

  console.log("Database schema initialized")
}

// Initialize the database
try {
  initializeDatabase()
} catch (error) {
  console.error("Error initializing database:", error)
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
  return crypto.randomUUID()
}

// User management
export async function createUser(email: string, password: string, fullName: string) {
  console.log(`Creating user with email: ${email}`)
  try {
    const hashedPassword = await hashPassword(password)

    const stmt = db.prepare(
      `INSERT INTO users (email, password_hash, full_name, credits, role)
       VALUES (?, ?, ?, 100, 'user')
       RETURNING id, email, full_name, credits, role, created_at`,
    )

    const result = stmt.get(email, hashedPassword, fullName) as any

    console.log("User created successfully:", result)
    return result
  } catch (error) {
    console.error("Error creating user:", error)
    throw error
  }
}

export function getUserByEmail(email: string) {
  console.log(`Looking up user with email: ${email}`)
  try {
    const stmt = db.prepare(
      `SELECT id, email, password_hash, full_name, avatar_url, credits, role, created_at, updated_at
       FROM users
       WHERE email = ?`,
    )

    const result = stmt.get(email) as any

    console.log("User lookup result:", result ? "User found" : "User not found")
    return result || null
  } catch (error) {
    console.error("Error looking up user:", error)
    throw error
  }
}

export function getUserById(id: number) {
  console.log(`Looking up user with id: ${id}`)
  try {
    const stmt = db.prepare(
      `SELECT id, email, full_name, avatar_url, credits, role, created_at, updated_at
       FROM users
       WHERE id = ?`,
    )

    const result = stmt.get(id) as any

    console.log("User lookup result:", result ? "User found" : "User not found")
    return result || null
  } catch (error) {
    console.error("Error looking up user:", error)
    throw error
  }
}

export function updateUserProfile(userId: number, data: { fullName?: string; avatarUrl?: string }) {
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

    query += " WHERE id = ? RETURNING id, email, full_name, avatar_url, credits, role"
    params.push(userId)

    const stmt = db.prepare(query)
    return stmt.get(...params) as any
  } catch (error) {
    console.error("Error updating user profile:", error)
    throw error
  }
}

// Document management
export function getDocumentsByUserId(userId: number) {
  try {
    const stmt = db.prepare(
      `SELECT id, title, user_id, created_at, updated_at
       FROM documents
       WHERE user_id = ?
       ORDER BY updated_at DESC`,
    )

    return stmt.all(userId) as any[]
  } catch (error) {
    console.error("Error getting documents:", error)
    throw error
  }
}

export function createDocument(userId: number, title: string, content: string) {
  try {
    const id = generateId()
    const stmt = db.prepare(
      `INSERT INTO documents (id, title, content, user_id)
       VALUES (?, ?, ?, ?)
       RETURNING id, title, user_id, created_at, updated_at`,
    )

    return stmt.get(id, title, content, userId) as any
  } catch (error) {
    console.error("Error creating document:", error)
    throw error
  }
}

export function getDocumentById(id: string, userId: number) {
  try {
    const stmt = db.prepare(
      `SELECT id, title, content, user_id, created_at, updated_at
       FROM documents
       WHERE id = ? AND user_id = ?`,
    )

    return (stmt.get(id, userId) as any) || null
  } catch (error) {
    console.error("Error getting document:", error)
    throw error
  }
}

export function updateDocument(id: string, userId: number, data: { title?: string; content?: string }) {
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

    query += " WHERE id = ? AND user_id = ? RETURNING id, title, content, user_id, created_at, updated_at"
    params.push(id, userId)

    const stmt = db.prepare(query)
    return stmt.get(...params) as any
  } catch (error) {
    console.error("Error updating document:", error)
    throw error
  }
}

export function deleteDocument(id: string, userId: number) {
  try {
    const stmt = db.prepare(
      `DELETE FROM documents
       WHERE id = ? AND user_id = ?
       RETURNING id`,
    )

    return (stmt.get(id, userId) as any) || null
  } catch (error) {
    console.error("Error deleting document:", error)
    throw error
  }
}

// Document versions
export function getDocumentVersions(documentId: string) {
  try {
    const stmt = db.prepare(
      `SELECT id, document_id, content, version_number, created_at
       FROM document_versions
       WHERE document_id = ?
       ORDER BY version_number ASC`,
    )

    return stmt.all(documentId) as any[]
  } catch (error) {
    console.error("Error getting document versions:", error)
    throw error
  }
}

export function createDocumentVersion(documentId: string, content: string, versionNumber: number) {
  try {
    const id = generateId()
    const stmt = db.prepare(
      `INSERT INTO document_versions (id, document_id, content, version_number)
       VALUES (?, ?, ?, ?)
       RETURNING id, document_id, content, version_number, created_at`,
    )

    return stmt.get(id, documentId, content, versionNumber) as any
  } catch (error) {
    console.error("Error creating document version:", error)
    throw error
  }
}

// Missing fields
export function getMissingFields(documentId: string) {
  try {
    const stmt = db.prepare(
      `SELECT id, document_id, field_name, field_value, created_at, updated_at
       FROM missing_fields
       WHERE document_id = ?`,
    )

    return stmt.all(documentId) as any[]
  } catch (error) {
    console.error("Error getting missing fields:", error)
    throw error
  }
}

export function updateMissingField(id: string, value: string) {
  try {
    const stmt = db.prepare(
      `UPDATE missing_fields
       SET field_value = ?
       WHERE id = ?
       RETURNING id, document_id, field_name, field_value, updated_at`,
    )

    return stmt.get(value, id) as any
  } catch (error) {
    console.error("Error updating missing field:", error)
    throw error
  }
}

// Credit management
export function getUserCredits(userId: number) {
  try {
    const stmt = db.prepare(
      `SELECT credits
       FROM users
       WHERE id = ?`,
    )

    const result = stmt.get(userId) as any
    return result?.credits || 0
  } catch (error) {
    console.error("Error getting user credits:", error)
    throw error
  }
}

export function updateUserCredits(userId: number, amount: number, description: string, type: "add" | "subtract") {
  try {
    // Start a transaction
    const transaction = db.transaction(() => {
      // Update user credits
      const updateStmt = db.prepare(
        `UPDATE users
         SET credits = credits ${type === "add" ? "+" : "-"} ?
         WHERE id = ?
         RETURNING credits`,
      )

      const userResult = updateStmt.get(amount, userId) as any

      // Record the transaction
      const transactionStmt = db.prepare(
        `INSERT INTO credit_transactions (user_id, amount, description, transaction_type)
         VALUES (?, ?, ?, ?)`,
      )

      transactionStmt.run(userId, amount, description, type)

      return userResult?.credits || 0
    })

    return transaction()
  } catch (error) {
    console.error("Error updating user credits:", error)
    throw error
  }
}

export function logUsage(userId: number, actionType: string, documentId: string | null, creditsUsed: number) {
  try {
    // Start a transaction
    const transaction = db.transaction(() => {
      // Log usage
      const logStmt = db.prepare(
        `INSERT INTO usage_logs (user_id, action_type, document_id, credits_used)
         VALUES (?, ?, ?, ?)`,
      )

      logStmt.run(userId, actionType, documentId, creditsUsed)

      // Subtract credits from user if needed
      if (creditsUsed > 0) {
        updateUserCredits(userId, creditsUsed, `Used ${creditsUsed} credits for ${actionType}`, "subtract")
      }
    })

    transaction()
  } catch (error) {
    console.error("Error logging usage:", error)
    throw error
  }
}

// Admin functions
export function getAllUsers(limit = 100, offset = 0) {
  try {
    const stmt = db.prepare(
      `SELECT id, email, full_name, avatar_url, credits, role, created_at, updated_at
       FROM users
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
    )

    return stmt.all(limit, offset) as any[]
  } catch (error) {
    console.error("Error getting all users:", error)
    throw error
  }
}

export function getUserCount() {
  try {
    const stmt = db.prepare(`SELECT COUNT(*) as count FROM users`)
    const result = stmt.get() as any
    return result?.count || 0
  } catch (error) {
    console.error("Error getting user count:", error)
    throw error
  }
}

export function getUsageStats(days = 30) {
  try {
    const stmt = db.prepare(
      `SELECT 
         action_type, 
         COUNT(*) as count, 
         SUM(credits_used) as total_credits
       FROM usage_logs
       WHERE created_at > datetime('now', '-' || ? || ' days')
       GROUP BY action_type
       ORDER BY total_credits DESC`,
    )

    return stmt.all(days) as any[]
  } catch (error) {
    console.error("Error getting usage stats:", error)
    throw error
  }
}

export function getUserUsageStats(userId: number, days = 30) {
  try {
    const stmt = db.prepare(
      `SELECT 
         action_type, 
         COUNT(*) as count, 
         SUM(credits_used) as total_credits
       FROM usage_logs
       WHERE user_id = ? AND created_at > datetime('now', '-' || ? || ' days')
       GROUP BY action_type
       ORDER BY total_credits DESC`,
    )

    return stmt.all(userId, days) as any[]
  } catch (error) {
    console.error("Error getting user usage stats:", error)
    throw error
  }
}

export function getCreditTransactions(userId: number, limit = 20) {
  try {
    const stmt = db.prepare(
      `SELECT id, amount, description, transaction_type, created_at
       FROM credit_transactions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
    )

    return stmt.all(userId, limit) as any[]
  } catch (error) {
    console.error("Error getting credit transactions:", error)
    throw error
  }
}

// Create admin user if it doesn't exist
export function createAdminUser() {
  try {
    const existingAdmin = getUserByEmail("admin@example.com")

    if (!existingAdmin) {
      console.log("Creating admin user")
      const hashedPassword = "$2a$10$mLK.rrdlvx9DCFb6Eck1t.TlltnGulepXnov3bBp5T2TloO1MYj52" // admin123

      const stmt = db.prepare(
        `INSERT INTO users (email, password_hash, full_name, credits, role)
         VALUES (?, ?, ?, 1000, 'admin')
         RETURNING id, email, full_name, credits, role`,
      )

      const result = stmt.get("admin@example.com", hashedPassword, "Admin User") as any
      console.log("Admin user created:", result)
    } else {
      console.log("Admin user already exists")
    }
  } catch (error) {
    console.error("Error creating admin user:", error)
  }
}

// Create admin user on initialization
createAdminUser()
