import { forms } from "./seedForms";
import crypto from "crypto";
import { prisma } from "../lib/prisma";

function hashPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.scryptSync(password, salt, 32);
  return `scrypt$${salt.toString("hex")}$${derivedKey.toString("hex")}`;
}

async function seed() {
  const superEmail = (process.env.SUPERUSER_EMAIL || "admin@example.com").trim().toLowerCase();
  const superPassword = process.env.SUPERUSER_PASSWORD || "admin12345";
  const superPasswordHash = hashPassword(superPassword);

  const existingUser = await prisma.user.findUnique({ where: { email: superEmail } });
  if (existingUser) {
    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        passwordHash: superPasswordHash,
        role: "admin",
      },
    });
    console.log(`🔄 Superuser '${superEmail}' updated`);
  } else {
    await prisma.user.create({
      data: {
        email: superEmail,
        passwordHash: superPasswordHash,
        role: "admin",
      },
    });
    console.log(`✅ Superuser '${superEmail}' created`);
  }

  for (const form of forms) {
    const existing = await prisma.form.findFirst({ where: { name: form.name } });
    if (existing) {
      await prisma.form.update({
        where: { id: existing.id },
        data: { json: JSON.stringify(form) },
      });
      console.log(`🔄 Form '${form.name}' updated`);
    } else {
      await prisma.form.create({
        data: {
          name: form.name,
          json: JSON.stringify(form),
        },
      });
      console.log(`✅ Form '${form.name}' seeded successfully`);
    }
  }
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
});
