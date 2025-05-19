import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET() {
  try {
    // Hardcode the connection string directly
    const connectionString =
      "postgres://neondb_owner:npg_OYi1e5oECHRB@ep-weathered-dew-a4gzhtwk-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"

    console.log("Connecting to database to create tables")

    const sql = neon(connectionString)

    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        avatar_url TEXT,
        credits INTEGER DEFAULT 100,
        role VARCHAR(50) DEFAULT 'user',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // Create documents table
    await sql`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // Create document_versions table
    await sql`
      CREATE TABLE IF NOT EXISTS document_versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        version_number INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(document_id, version_number)
      )
    `

    // Create missing_fields table
    await sql`
      CREATE TABLE IF NOT EXISTS missing_fields (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        field_name TEXT NOT NULL,
        field_value TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(document_id, field_name)
      )
    `

    // Create credit_transactions table
    await sql`
      CREATE TABLE IF NOT EXISTS credit_transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        description TEXT NOT NULL,
        transaction_type VARCHAR(50) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // Create usage_logs table
    await sql`
      CREATE TABLE IF NOT EXISTS usage_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        action_type VARCHAR(50) NOT NULL,
        document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
        credits_used INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    // Create updated_at function
    await sql`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql'
    `

    // Create triggers for updated_at
    await sql`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users
    `

    await sql`
      CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
    `

    await sql`
      DROP TRIGGER IF EXISTS update_documents_updated_at ON documents
    `

    await sql`
      CREATE TRIGGER update_documents_updated_at
      BEFORE UPDATE ON documents
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
    `

    await sql`
      DROP TRIGGER IF EXISTS update_missing_fields_updated_at ON missing_fields
    `

    await sql`
      CREATE TRIGGER update_missing_fields_updated_at
      BEFORE UPDATE ON missing_fields
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column()
    `

    // Create admin user
    await sql`
      INSERT INTO users (email, password_hash, full_name, credits, role)
      VALUES (
        'admin@example.com', 
        '$2a$10$mLK.rrdlvx9DCFb6Eck1t.TlltnGulepXnov3bBp5T2TloO1MYj52', 
        'Admin User', 
        1000, 
        'admin'
      )
      ON CONFLICT (email) 
      DO UPDATE SET 
        role = 'admin',
        credits = 1000
    `

    return NextResponse.json({
      success: true,
      message: "Database tables created successfully",
    })
  } catch (error) {
    console.error("Error creating database tables:", error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
