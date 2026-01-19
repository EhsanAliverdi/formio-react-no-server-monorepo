import { Pool, PoolClient } from "pg";

let pool: Pool | null = null;

// Lightweight wrapper interface to mimic the old sqlite Database API
// so the rest of the codebase can keep using db.get/db.all/db.run/db.exec.
export type Db = {
  query: <T = any>(text: string, params?: any[]) => Promise<T[]>;
  get: <T = any>(text: string, ...params: any[]) => Promise<T | null>;
  all: <T = any>(text: string, ...params: any[]) => Promise<T[]>;
  run: (text: string, ...params: any[]) => Promise<{ changes: number; lastID: number | null }>;
  exec: (text: string) => Promise<void>;
};

let dbInstance: Db | null = null;

async function ensureFormsColumns(client: PoolClient) {
  const result = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'forms'
  `);
  const existing = new Set(result.rows.map((r) => r.column_name));

  const columns: Array<{ name: string; def: string }> = [
    { name: "allow_anonymous_submit", def: "BOOLEAN NOT NULL DEFAULT true" },
    { name: "visibility", def: "VARCHAR(50) NOT NULL DEFAULT 'public'" },
  ];

  for (const col of columns) {
    if (existing.has(col.name)) continue;
    await client.query(`ALTER TABLE forms ADD COLUMN ${col.name} ${col.def}`);
    existing.add(col.name);
  }

  if (existing.has("visibility")) {
    await client.query("UPDATE forms SET visibility = 'public' WHERE visibility IS NULL OR TRIM(COALESCE(visibility, '')) = ''");
  }
}

async function ensureFormAccessTables(client: PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS form_allowed_roles (
      form_id INTEGER NOT NULL,
      role VARCHAR(50) NOT NULL,
      PRIMARY KEY(form_id, role),
      FOREIGN KEY(form_id) REFERENCES forms(id) ON DELETE CASCADE
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_form_allowed_roles_role ON form_allowed_roles(role)
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS form_allowed_users (
      form_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      PRIMARY KEY(form_id, user_id),
      FOREIGN KEY(form_id) REFERENCES forms(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_form_allowed_users_user_id ON form_allowed_users(user_id)
  `);
}

async function ensureUserProfileColumns(client: PoolClient) {
  const result = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'users'
  `);
  const existing = new Set(result.rows.map((r) => r.column_name));

  const columns: Array<{ name: string; def: string }> = [
    { name: "display_name", def: "TEXT" },
    { name: "preferred_name", def: "TEXT" },
    { name: "first_name", def: "TEXT" },
    { name: "middle_name", def: "TEXT" },
    { name: "last_name", def: "TEXT" },
    { name: "pronouns", def: "TEXT" },
    { name: "date_of_birth", def: "TEXT" },
    { name: "phone", def: "TEXT" },
    { name: "job_title", def: "TEXT" },
    { name: "department", def: "TEXT" },
    { name: "company", def: "TEXT" },
    { name: "website_url", def: "TEXT" },
    { name: "bio", def: "TEXT" },
    { name: "address_line1", def: "TEXT" },
    { name: "address_line2", def: "TEXT" },
    { name: "city", def: "TEXT" },
    { name: "state", def: "TEXT" },
    { name: "postal_code", def: "TEXT" },
    { name: "country", def: "TEXT" },
    { name: "timezone", def: "TEXT" },
    { name: "locale", def: "TEXT" },
    { name: "avatar_url", def: "TEXT" },
    { name: "is_active", def: "BOOLEAN NOT NULL DEFAULT true" },
  ];

  for (const col of columns) {
    if (existing.has(col.name)) continue;
    await client.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.def}`);
    existing.add(col.name);
  }

  if (existing.has("is_active")) {
    await client.query("UPDATE users SET is_active = true WHERE is_active IS NULL");
  }
}

async function ensureFormSubmissionsColumns(client: PoolClient) {
  const result = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'form_submissions'
  `);
  const existing = new Set(result.rows.map((r) => r.column_name));

  const columns: Array<{ name: string; def: string }> = [
    { name: "updated_at", def: "TIMESTAMP" },
    { name: "updated_by", def: "INTEGER" },
    { name: "edit_history", def: "TEXT" },
  ];

  for (const col of columns) {
    if (existing.has(col.name)) continue;
    await client.query(`ALTER TABLE form_submissions ADD COLUMN ${col.name} ${col.def}`);
    existing.add(col.name);
  }

  if (existing.has("edit_history")) {
    await client.query("UPDATE form_submissions SET edit_history = '[]' WHERE edit_history IS NULL");
  }
}

async function ensureNotificationsTables(client: PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'info',
      level VARCHAR(50) NOT NULL DEFAULT 'normal',
      created_by INTEGER,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  const result = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'notifications'
  `);
  const existing = new Set(result.rows.map((r) => r.column_name));
  if (!existing.has("level")) {
    await client.query("ALTER TABLE notifications ADD COLUMN level VARCHAR(50) NOT NULL DEFAULT 'normal'");
  }

  await client.query(`
    CREATE TABLE IF NOT EXISTS notification_recipients (
      notification_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      delivered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      read_at TIMESTAMP,
      PRIMARY KEY(notification_id, user_id),
      FOREIGN KEY(notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at)
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_notification_recipients_user_id ON notification_recipients(user_id)
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_notification_recipients_user_unread ON notification_recipients(user_id, read_at)
  `);
}


async function initPoolAndMigrate() {
  if (pool && dbInstance) return;

  // Get DATABASE_URL from environment
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  // Create connection pool
  pool = new Pool({
    connectionString: databaseUrl,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Test connection and initialize schema
  const client = await pool.connect();
  try {
    // Create tables
    await client.query(`
      CREATE TABLE IF NOT EXISTS forms (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        json TEXT NOT NULL,
        allow_anonymous_submit BOOLEAN NOT NULL DEFAULT true,
        visibility VARCHAR(50) NOT NULL DEFAULT 'public'
      )
    `);

    await ensureFormsColumns(client);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'admin',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await ensureUserProfileColumns(client);

    await ensureFormAccessTables(client);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        token_hash VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS form_submissions (
        id SERIAL PRIMARY KEY,
        form_id INTEGER NOT NULL,
        user_id INTEGER,
        submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        data TEXT NOT NULL,
        updated_at TIMESTAMP,
        updated_by INTEGER,
        edit_history TEXT,
        FOREIGN KEY(form_id) REFERENCES forms(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await ensureFormSubmissionsColumns(client);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions(form_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_form_submissions_user_id ON form_submissions(user_id)
    `);

    await ensureNotificationsTables(client);

    await client.query(`
      CREATE TABLE IF NOT EXISTS site_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

  } finally {
    client.release();
  }

  // Expose a Db-like wrapper on top of the pool
  dbInstance = {
    query: query,
    get,
    all,
    run,
    exec,
  };
}

export async function getDb(): Promise<Db> {
  if (!dbInstance) {
    await initPoolAndMigrate();
  }
  // dbInstance is guaranteed after init
  return dbInstance as Db;
}

// Helper to convert `?` placeholders to PostgreSQL-style $1, $2, ...
function convertPlaceholders(text: string): string {
  let paramIndex = 1;
  return text.replace(/\?/g, () => `$${paramIndex++}`);
}

// Helper methods to provide a SQLite-like interface for compatibility,
// backed directly by the pg client. This keeps the existing SQL surface
// while routing all connections through the configured PostgreSQL pool.
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  if (!pool || !dbInstance) {
    await initPoolAndMigrate();
  }
  if (!pool) {
    throw new Error("Database pool not initialized");
  }

  const convertedText = convertPlaceholders(text);
  const result = await pool.query(convertedText, params);
  return result.rows as T[];
}

export async function get<T = any>(text: string, ...params: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function all<T = any>(text: string, ...params: any[]): Promise<T[]> {
  return query<T>(text, params);
}

export async function run(text: string, ...params: any[]): Promise<{ changes: number; lastID: number | null }> {
  if (!pool || !dbInstance) {
    await initPoolAndMigrate();
  }
  if (!pool) {
    throw new Error("Database pool not initialized");
  }

  const convertedText = convertPlaceholders(text);
  const result = await pool.query(convertedText, params);
  return {
    changes: result.rowCount || 0,
    lastID: (result.rows[0] as any)?.id ?? null,
  };
}

export async function exec(text: string): Promise<void> {
  if (!pool || !dbInstance) {
    await initPoolAndMigrate();
  }
  if (!pool) {
    throw new Error("Database pool not initialized");
  }
  const convertedText = convertPlaceholders(text);
  await pool.query(convertedText);
}
