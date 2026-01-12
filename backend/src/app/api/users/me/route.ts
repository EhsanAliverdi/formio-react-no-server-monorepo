import { corsHeaders, jsonResponse, requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: Request) {
  const auth = await requireRole(req, ["admin", "editor", "viewer"]);
  if (!auth.ok) return auth.res;

  const db = await getDb();
  const row = await db.get(
    "SELECT id, email, role, is_active, created_at, display_name, preferred_name, first_name, middle_name, last_name, pronouns, date_of_birth, phone, job_title, department, company, website_url, bio, address_line1, address_line2, city, state, postal_code, country, timezone, locale, avatar_url FROM users WHERE id = ?",
    auth.user.id
  );

  if (!row) {
    return jsonResponse({ error: "Not found" }, { status: 404 });
  }

  return jsonResponse(row);
}

export async function PUT(req: Request) {
  const auth = await requireRole(req, ["admin", "editor", "viewer"]);
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => null);

  const displayName = typeof body?.display_name === "string" ? body.display_name.trim() : undefined;
  const preferredName = typeof body?.preferred_name === "string" ? body.preferred_name.trim() : undefined;
  const firstName = typeof body?.first_name === "string" ? body.first_name.trim() : undefined;
  const middleName = typeof body?.middle_name === "string" ? body.middle_name.trim() : undefined;
  const lastName = typeof body?.last_name === "string" ? body.last_name.trim() : undefined;
  const pronouns = typeof body?.pronouns === "string" ? body.pronouns.trim() : undefined;
  const dateOfBirth = typeof body?.date_of_birth === "string" ? body.date_of_birth.trim() : undefined;
  const phone = typeof body?.phone === "string" ? body.phone.trim() : undefined;
  const jobTitle = typeof body?.job_title === "string" ? body.job_title.trim() : undefined;
  const department = typeof body?.department === "string" ? body.department.trim() : undefined;
  const company = typeof body?.company === "string" ? body.company.trim() : undefined;
  const websiteUrl = typeof body?.website_url === "string" ? body.website_url.trim() : undefined;
  const bio = typeof body?.bio === "string" ? body.bio.trim() : undefined;
  const addressLine1 = typeof body?.address_line1 === "string" ? body.address_line1.trim() : undefined;
  const addressLine2 = typeof body?.address_line2 === "string" ? body.address_line2.trim() : undefined;
  const city = typeof body?.city === "string" ? body.city.trim() : undefined;
  const state = typeof body?.state === "string" ? body.state.trim() : undefined;
  const postalCode = typeof body?.postal_code === "string" ? body.postal_code.trim() : undefined;
  const country = typeof body?.country === "string" ? body.country.trim() : undefined;
  const timezone = typeof body?.timezone === "string" ? body.timezone.trim() : undefined;
  const locale = typeof body?.locale === "string" ? body.locale.trim() : undefined;
  const avatarUrl = typeof body?.avatar_url === "string" ? body.avatar_url.trim() : undefined;

  const updates: string[] = [];
  const params: Array<string | number | null> = [];

  if (displayName !== undefined) {
    updates.push("display_name = ?");
    params.push(displayName || null);
  }

  if (preferredName !== undefined) {
    updates.push("preferred_name = ?");
    params.push(preferredName || null);
  }

  if (firstName !== undefined) {
    updates.push("first_name = ?");
    params.push(firstName || null);
  }

  if (middleName !== undefined) {
    updates.push("middle_name = ?");
    params.push(middleName || null);
  }

  if (lastName !== undefined) {
    updates.push("last_name = ?");
    params.push(lastName || null);
  }

  if (pronouns !== undefined) {
    updates.push("pronouns = ?");
    params.push(pronouns || null);
  }

  if (dateOfBirth !== undefined) {
    updates.push("date_of_birth = ?");
    params.push(dateOfBirth || null);
  }

  if (phone !== undefined) {
    updates.push("phone = ?");
    params.push(phone || null);
  }

  if (jobTitle !== undefined) {
    updates.push("job_title = ?");
    params.push(jobTitle || null);
  }

  if (department !== undefined) {
    updates.push("department = ?");
    params.push(department || null);
  }

  if (company !== undefined) {
    updates.push("company = ?");
    params.push(company || null);
  }

  if (websiteUrl !== undefined) {
    updates.push("website_url = ?");
    params.push(websiteUrl || null);
  }

  if (bio !== undefined) {
    updates.push("bio = ?");
    params.push(bio || null);
  }

  if (addressLine1 !== undefined) {
    updates.push("address_line1 = ?");
    params.push(addressLine1 || null);
  }

  if (addressLine2 !== undefined) {
    updates.push("address_line2 = ?");
    params.push(addressLine2 || null);
  }

  if (city !== undefined) {
    updates.push("city = ?");
    params.push(city || null);
  }

  if (state !== undefined) {
    updates.push("state = ?");
    params.push(state || null);
  }

  if (postalCode !== undefined) {
    updates.push("postal_code = ?");
    params.push(postalCode || null);
  }

  if (country !== undefined) {
    updates.push("country = ?");
    params.push(country || null);
  }

  if (timezone !== undefined) {
    updates.push("timezone = ?");
    params.push(timezone || null);
  }

  if (locale !== undefined) {
    updates.push("locale = ?");
    params.push(locale || null);
  }

  if (avatarUrl !== undefined) {
    updates.push("avatar_url = ?");
    params.push(avatarUrl || null);
  }

  if (updates.length === 0) {
    return jsonResponse({ error: "No changes" }, { status: 400 });
  }

  const db = await getDb();
  const result = await db.run(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, ...params, auth.user.id);

  if (result.changes === 0) {
    return jsonResponse({ error: "Not found" }, { status: 404 });
  }

  const row = await db.get(
    "SELECT id, email, role, is_active, created_at, display_name, preferred_name, first_name, middle_name, last_name, pronouns, date_of_birth, phone, job_title, department, company, website_url, bio, address_line1, address_line2, city, state, postal_code, country, timezone, locale, avatar_url FROM users WHERE id = ?",
    auth.user.id
  );

  return jsonResponse({ success: true, user: row });
}
