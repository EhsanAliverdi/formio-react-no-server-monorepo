import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";
import path from "path";
import fs from "fs";

let db: Database | null = null;

async function ensureFormsColumns(database: Database) {
  const rows = (await database.all("PRAGMA table_info(forms)")) as Array<{ name: string }>;
  const existing = new Set(rows.map((r) => String(r.name)));

  const columns: Array<{ name: string; def: string }> = [
    { name: "allow_anonymous_submit", def: "INTEGER NOT NULL DEFAULT 1" },
  ];

  for (const col of columns) {
    if (existing.has(col.name)) continue;
    await database.exec(`ALTER TABLE forms ADD COLUMN ${col.name} ${col.def};`);
    existing.add(col.name);
  }
}

async function ensureUserProfileColumns(database: Database) {
  const rows = (await database.all("PRAGMA table_info(users)")) as Array<{ name: string }>;
  const existing = new Set(rows.map((r) => String(r.name)));

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
    { name: "is_active", def: "INTEGER NOT NULL DEFAULT 1" },
  ];

  for (const col of columns) {
    if (existing.has(col.name)) continue;
    await database.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.def};`);
    existing.add(col.name);
  }

  if (existing.has("is_active")) {
    await database.exec("UPDATE users SET is_active = 1 WHERE is_active IS NULL;");
  }
}

async function ensureFormSubmissionsColumns(database: Database) {
  const rows = (await database.all("PRAGMA table_info(form_submissions)")) as Array<{ name: string }>;
  const existing = new Set(rows.map((r) => String(r.name)));

  const columns: Array<{ name: string; def: string }> = [
    { name: "updated_at", def: "TEXT" },
    { name: "updated_by", def: "INTEGER" },
    { name: "edit_history", def: "TEXT" },
  ];

  for (const col of columns) {
    if (existing.has(col.name)) continue;
    await database.exec(`ALTER TABLE form_submissions ADD COLUMN ${col.name} ${col.def};`);
    existing.add(col.name);
  }

  if (existing.has("edit_history")) {
    await database.exec("UPDATE form_submissions SET edit_history = '[]' WHERE edit_history IS NULL;");
  }
}

async function ensureNotificationsTables(database: Database) {
  await database.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  await database.exec(`
    CREATE TABLE IF NOT EXISTS notification_recipients (
      notification_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      delivered_at TEXT NOT NULL DEFAULT (datetime('now')),
      read_at TEXT,
      PRIMARY KEY(notification_id, user_id),
      FOREIGN KEY(notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  await database.exec(`
    CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
  `);

  await database.exec(`
    CREATE INDEX IF NOT EXISTS idx_notification_recipients_user_id ON notification_recipients(user_id);
  `);

  await database.exec(`
    CREATE INDEX IF NOT EXISTS idx_notification_recipients_user_unread ON notification_recipients(user_id, read_at);
  `);
}

export async function getDb() {
  // Ensure single instance
  if (db) return db;

  // Resolve path: backend/data/forms.db (default) or an override.
  // In Docker Desktop on Windows, binding SQLite onto the host filesystem
  // can cause low-level errors (e.g. SIGBUS) due to mmap semantics.
  // Use SQLITE_DB_PATH + a Docker named volume to avoid that.
  const dbPath = (process.env.SQLITE_DB_PATH && process.env.SQLITE_DB_PATH.trim())
    ? process.env.SQLITE_DB_PATH.trim()
    : path.join(process.cwd(), "data", "forms.db");

  // Create /data folder if missing
  const folder = path.dirname(dbPath);
  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  // Create empty DB file if not exists
  if (!fs.existsSync(dbPath)) {
    console.log("Creating SQLite database:", dbPath);
    fs.writeFileSync(dbPath, "");
  }

  // Open DB connection
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  // Auto-create table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS forms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      json TEXT NOT NULL,
      allow_anonymous_submit INTEGER NOT NULL DEFAULT 1
    );
  `);

  await ensureFormsColumns(db);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await ensureUserProfileColumns(db);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token_hash TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS form_submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      form_id INTEGER NOT NULL,
      user_id INTEGER,
      submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
      data TEXT NOT NULL,
      updated_at TEXT,
      updated_by INTEGER,
      edit_history TEXT,
      FOREIGN KEY(form_id) REFERENCES forms(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  await ensureFormSubmissionsColumns(db);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions(form_id);
  `);

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_form_submissions_user_id ON form_submissions(user_id);
  `);

  await ensureNotificationsTables(db);

  return db;
}
