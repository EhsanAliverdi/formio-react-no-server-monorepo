import { corsHeaders, hashPassword, jsonResponse, requireAdmin, type Role } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const db = await getDb();
  const users = await db.all(
    "SELECT id, email, role, is_active, created_at, display_name, preferred_name, first_name, middle_name, last_name, pronouns, date_of_birth, phone, job_title, department, company, website_url, bio, address_line1, address_line2, city, state, postal_code, country, timezone, locale, avatar_url FROM users ORDER BY id DESC"
  );

  return jsonResponse(users);
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const roleRaw = typeof body?.role === "string" ? body.role : "viewer";
  const role: Role = roleRaw === "admin" || roleRaw === "editor" || roleRaw === "viewer" ? roleRaw : "viewer";

  const isActiveRaw = body?.is_active;
  const isActive =
    typeof isActiveRaw === "boolean"
      ? isActiveRaw
        ? 1
        : 0
      : typeof isActiveRaw === "number"
        ? isActiveRaw
          ? 1
          : 0
        : typeof isActiveRaw === "string"
          ? isActiveRaw.trim().toLowerCase() === "active" || isActiveRaw.trim() === "1"
            ? 1
            : 0
          : 1;

  const normalizeText = (value: unknown) => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const displayName = normalizeText(body?.display_name);
  const preferredName = normalizeText(body?.preferred_name);
  const firstName = normalizeText(body?.first_name);
  const middleName = normalizeText(body?.middle_name);
  const lastName = normalizeText(body?.last_name);
  const pronouns = normalizeText(body?.pronouns);
  const dateOfBirth = normalizeText(body?.date_of_birth);
  const phone = normalizeText(body?.phone);
  const jobTitle = normalizeText(body?.job_title);
  const department = normalizeText(body?.department);
  const company = normalizeText(body?.company);
  const websiteUrl = normalizeText(body?.website_url);
  const bio = normalizeText(body?.bio);
  const addressLine1 = normalizeText(body?.address_line1);
  const addressLine2 = normalizeText(body?.address_line2);
  const city = normalizeText(body?.city);
  const state = normalizeText(body?.state);
  const postalCode = normalizeText(body?.postal_code);
  const country = normalizeText(body?.country);
  const timezone = normalizeText(body?.timezone);
  const locale = normalizeText(body?.locale);
  const avatarUrl = normalizeText(body?.avatar_url);

  if (!email || !password) {
    return jsonResponse({ error: "Missing email or password" }, { status: 400 });
  }

  const passwordHash = hashPassword(password);
  const db = await getDb();

  try {
    const result = await db.run(
      "INSERT INTO users (email, password_hash, role, is_active, display_name, preferred_name, first_name, middle_name, last_name, pronouns, date_of_birth, phone, job_title, department, company, website_url, bio, address_line1, address_line2, city, state, postal_code, country, timezone, locale, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      email,
      passwordHash,
      role,
      isActive,
      displayName,
      preferredName,
      firstName,
      middleName,
      lastName,
      pronouns,
      dateOfBirth,
      phone,
      jobTitle,
      department,
      company,
      websiteUrl,
      bio,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      timezone,
      locale,
      avatarUrl
    );

    return jsonResponse({
      success: true,
      id: result.lastID,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.toLowerCase().includes("unique")) {
      return jsonResponse({ error: "Email already exists" }, { status: 409 });
    }
    return jsonResponse({ error: "Failed to create user" }, { status: 500 });
  }
}
