import { open } from "sqlite"
import sqlite3 from "sqlite3"
import bcrypt from "bcryptjs"
import fs from "fs"
import path from "path"
import { v4 as uuidv4 } from "uuid"

// Ensure the data directory exists
const DATA_DIR = path.join(process.cwd(), "data")
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

// Initialize SQLite database
const DB_PATH = path.join(DATA_DIR, "database.sqlite")
console.log(`Initializing SQLite database at: ${DB_PATH}`)

// Database connection promise
let dbPromise: Promise<any> | null = null

// Get database connection
export async function getDb() {
  if (!dbPromise) {
    dbPromise = open({
      filename: DB_PATH,
      driver: sqlite3.Database,
    })
  }
  return dbPromise
}

// Initialize database schema
export async function initializeDatabase() {
  const db = await getDb()

  // Create users table
  await db.exec(`
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
  await db.exec(`
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
  await db.exec(`
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
  await db.exec(`
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
  await db.exec(`
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
  await db.exec(`
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
  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_users_updated_at
    AFTER UPDATE ON users
    FOR EACH ROW
    BEGIN
      UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `)

  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_documents_updated_at
    AFTER UPDATE ON documents
    FOR EACH ROW
    BEGIN
      UPDATE documents SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `)

  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS update_missing_fields_updated_at
    AFTER UPDATE ON missing_fields
    FOR EACH ROW
    BEGIN
      UPDATE missing_fields SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END
  `)

  console.log("Database schema initialized")
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
  console.log(`Creating user with email: ${email}`)
  try {
    const db = await getDb()
    const hashedPassword = await hashPassword(password)

    const result = await db.run(
      `INSERT INTO users (email, password_hash, full_name, credits, role)
       VALUES (?, ?, ?, 100, 'user')`,
      [email, hashedPassword, fullName],
    )

    const user = await db.get(
      `SELECT id, email, full_name, credits, role, created_at
       FROM users
       WHERE id = ?`,
      [result.lastID],
    )

    console.log("User created successfully:", user)
    return user
  } catch (error) {
    console.error("Error creating user:", error)
    throw error
  }
}

export async function getUserByEmail(email: string) {
  console.log(`Looking up user with email: ${email}`)
  try {
    const db = await getDb()
    const user = await db.get(
      `SELECT id, email, password_hash, full_name, avatar_url, credits, role, created_at, updated_at
       FROM users
       WHERE email = ?`,
      [email],
    )

    console.log("User lookup result:", user ? "User found" : "User not found")
    return user || null
  } catch (error) {
    console.error("Error looking up user:", error)
    throw error
  }
}

export async function getUserById(id: number) {
  console.log(`Looking up user with id: ${id}`)
  try {
    const db = await getDb()
    const user = await db.get(
      `SELECT id, email, full_name, avatar_url, credits, role, created_at, updated_at
       FROM users
       WHERE id = ?`,
      [id],
    )

    console.log("User lookup result:", user ? "User found" : "User not found")
    return user || null
  } catch (error) {
    console.error("Error looking up user:", error)
    throw error
  }
}

export async function updateUserProfile(userId: number, data: { fullName?: string; avatarUrl?: string }) {
  const { fullName, avatarUrl } = data

  if (!fullName && !avatarUrl) return null

  try {
    const db = await getDb()
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

    query += " WHERE id = ?"
    params.push(userId)

    await db.run(query, params)

    return await db.get(
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
  try {
    const db = await getDb()
    return await db.all(
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
  try {
    const db = await getDb()
    const id = generateId()

    await db.run(
      `INSERT INTO documents (id, title, content, user_id)
       VALUES (?, ?, ?, ?)`,
      [id, title, content, userId],
    )

    return await db.get(
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
  try {
    const db = await getDb()
    return await db.get(
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
  const { title, content } = data

  if (!title && !content) return null

  try {
    const db = await getDb()
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

    query += " WHERE id = ? AND user_id = ?"
    params.push(id, userId)

    await db.run(query, params)

    return await db.get(
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
  try {
    const db = await getDb()
    await db.run(
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
  try {
    const db = await getDb()
    return await db.all(
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
  try {
    const db = await getDb()
    const id = generateId()

    await db.run(
      `INSERT INTO document_versions (id, document_id, content, version_number)
       VALUES (?, ?, ?, ?)`,
      [id, documentId, content, versionNumber],
    )

    return await db.get(
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
  try {
    const db = await getDb()
    return await db.all(
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
  try {
    const db = await getDb()
    await db.run(
      `UPDATE missing_fields
       SET field_value = ?
       WHERE id = ?`,
      [value, id],
    )

    return await db.get(
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
  try {
    const db = await getDb()
    const result = await db.get(
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
  try {
    const db = await getDb()

    // Update user credits
    await db.run(
      `UPDATE users
       SET credits = credits ${type === "add" ? "+" : "-"} ?
       WHERE id = ?`,
      [amount, userId],
    )

    // Record the transaction
    await db.run(
      `INSERT INTO credit_transactions (user_id, amount, description, transaction_type)
       VALUES (?, ?, ?, ?)`,
      [userId, amount, description, type],
    )

    const result = await db.get(
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
  try {
    const db = await getDb()

    // Log usage
    await db.run(
      `INSERT INTO usage_logs (user_id, action_type, document_id, credits_used)
       VALUES (?, ?, ?, ?)`,
      [userId, actionType, documentId, creditsUsed],
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
  try {
    const db = await getDb()
    return await db.all(
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
  try {
    const db = await getDb()
    const result = await db.get(`SELECT COUNT(*) as count FROM users`)
    return result?.count || 0
  } catch (error) {
    console.error("Error getting user count:", error)
    throw error
  }
}

export async function getUsageStats(days = 30) {
  try {
    const db = await getDb()
    return await db.all(
      `SELECT 
         action_type, 
         COUNT(*) as count, 
         SUM(credits_used) as total_credits
       FROM usage_logs
       WHERE created_at > datetime('now', '-' || ? || ' days')
       GROUP BY action_type
       ORDER BY total_credits DESC`,
      [days],
    )
  } catch (error) {
    console.error("Error getting usage stats:", error)
    throw error
  }
}

export async function getUserUsageStats(userId: number, days = 30) {
  try {
    const db = await getDb()
    return await db.all(
      `SELECT 
         action_type, 
         COUNT(*) as count, 
         SUM(credits_used) as total_credits
       FROM usage_logs
       WHERE user_id = ? AND created_at > datetime('now', '-' || ? || ' days')
       GROUP BY action_type
       ORDER BY total_credits DESC`,
      [userId, days],
    )
  } catch (error) {
    console.error("Error getting user usage stats:", error)
    throw error
  }
}

export async function getCreditTransactions(userId: number, limit = 20) {
  try {
    const db = await getDb()
    return await db.all(
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

// Create admin user if it doesn't exist
export async function createAdminUser() {
  try {
    const db = await getDb()
    const existingAdmin = await getUserByEmail("admin@example.com")

    if (!existingAdmin) {
      console.log("Creating admin user")
      const hashedPassword = "$2a$10$mLK.rrdlvx9DCFb6Eck1t.TlltnGulepXnov3bBp5T2TloO1MYj52" // admin123

      await db.run(
        `INSERT INTO users (email, password_hash, full_name, credits, role)
         VALUES (?, ?, ?, 1000, 'admin')`,
        ["admin@example.com", hashedPassword, "Admin User"],
      )

      const admin = await getUserByEmail("admin@example.com")
      console.log("Admin user created:", admin)
    } else {
      console.log("Admin user already exists")
    }
  } catch (error) {
    console.error("Error creating admin user:", error)
  }
}

// Initialize the database and create admin user
export async function initDb() {
  try {
    await initializeDatabase()
    await createAdminUser()
    console.log("Database initialized successfully")
  } catch (error) {
    console.error("Error initializing database:", error)
  }
}

// Initialize the database when this module is imported
initDb()
