import { open } from "sqlite";
import sqlite3 from "sqlite3";
import path from "path";
import { forms } from "./seedForms";
import crypto from "crypto";

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.scryptSync(password, salt, 32);
  return `scrypt$${salt.toString("hex")}$${derivedKey.toString("hex")}`;
}

async function seed() {
  const dbPath = (process.env.SQLITE_DB_PATH && process.env.SQLITE_DB_PATH.trim())
    ? process.env.SQLITE_DB_PATH.trim()
    : path.join(process.cwd(), "data/forms.db");

  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Ensure table exists
  await db.exec(`
    CREATE TABLE IF NOT EXISTS forms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      json TEXT NOT NULL
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

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

  const superEmail = (process.env.SUPERUSER_EMAIL || "admin@example.com").trim().toLowerCase();
  const superPassword = process.env.SUPERUSER_PASSWORD || "admin12345";
  const superPasswordHash = hashPassword(superPassword);

  const existingUser = await db.get("SELECT id FROM users WHERE email = ?", superEmail);
  if (existingUser) {
    await db.run(
      "UPDATE users SET password_hash = ?, role = 'admin' WHERE email = ?",
      superPasswordHash,
      superEmail
    );
    console.log(`🔄 Superuser '${superEmail}' updated`);
  } else {
    await db.run(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'admin')",
      superEmail,
      superPasswordHash
    );
    console.log(`✅ Superuser '${superEmail}' created`);
  }

  for (const form of forms) {
    // Check if form already exists
    const existing = await db.get(
      "SELECT id FROM forms WHERE name = ?",
      form.name
    );
    if (existing) {
      await db.run(
        "UPDATE forms SET json = ? WHERE name = ?",
        JSON.stringify(form),
        form.name
      );
      console.log(`🔄 Form '${form.name}' updated`);
    } else {
      await db.run(
        "INSERT INTO forms (name, json) VALUES (?, ?)",
        form.name,
        JSON.stringify(form)
      );
      console.log(`✅ Form '${form.name}' seeded successfully`);
    }
  }
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
});
