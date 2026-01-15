import { forms } from "./seedForms";
import crypto from "crypto";
import { get, run } from "../lib/db";

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.scryptSync(password, salt, 32);
  return `scrypt$${salt.toString("hex")}$${derivedKey.toString("hex")}`;
}

async function seed() {
  const superEmail = (process.env.SUPERUSER_EMAIL || "admin@example.com").trim().toLowerCase();
  const superPassword = process.env.SUPERUSER_PASSWORD || "admin12345";
  const superPasswordHash = hashPassword(superPassword);

  const existingUser = await get("SELECT id FROM users WHERE email = ?", superEmail);
  if (existingUser) {
    await run(
      "UPDATE users SET password_hash = ?, role = 'admin' WHERE email = ?",
      superPasswordHash,
      superEmail
    );
    console.log(`🔄 Superuser '${superEmail}' updated`);
  } else {
    await run(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'admin')",
      superEmail,
      superPasswordHash
    );
    console.log(`✅ Superuser '${superEmail}' created`);
  }

  for (const form of forms) {
    // Check if form already exists
    const existing = await get(
      "SELECT id FROM forms WHERE name = ?",
      form.name
    );
    if (existing) {
      await run(
        "UPDATE forms SET json = ? WHERE name = ?",
        JSON.stringify(form),
        form.name
      );
      console.log(`🔄 Form '${form.name}' updated`);
    } else {
      await run(
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
