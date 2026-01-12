import { corsHeaders, hashPassword, jsonResponse, requireAdmin, type Role } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: RouteContext) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const { id } = await context.params;
  const userId = Number(id);
  if (!Number.isFinite(userId)) {
    return jsonResponse({ error: "Invalid user id" }, { status: 400 });
  }

  const db = await getDb();
  const row = await db.get(
    "SELECT id, email, role, is_active, created_at, display_name, preferred_name, first_name, middle_name, last_name, pronouns, date_of_birth, phone, job_title, department, company, website_url, bio, address_line1, address_line2, city, state, postal_code, country, timezone, locale, avatar_url FROM users WHERE id = ?",
    userId
  );

  if (!row) {
    return jsonResponse({ error: "Not found" }, { status: 404 });
  }

  return jsonResponse(row);
}

export async function PUT(req: Request, context: RouteContext) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const { id } = await context.params;
  const userId = Number(id);
  if (!Number.isFinite(userId)) {
    return jsonResponse({ error: "Invalid user id" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const roleRaw = typeof body?.role === "string" ? body.role : undefined;
  const password = typeof body?.password === "string" ? body.password : undefined;

  const isActiveRaw = body?.is_active;
  const isActive =
    isActiveRaw === undefined
      ? undefined
      : typeof isActiveRaw === "boolean"
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
            : undefined;

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

  if (roleRaw !== undefined) {
    const role: Role = roleRaw === "admin" || roleRaw === "editor" || roleRaw === "viewer" ? roleRaw : "viewer";
    updates.push("role = ?");
    params.push(role);
  }

  if (password !== undefined && password.trim().length > 0) {
    updates.push("password_hash = ?");
    params.push(hashPassword(password));
  }

  if (isActive !== undefined) {
    updates.push("is_active = ?");
    params.push(isActive);
  }

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
  const result = await db.run(
    `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
    ...params,
    userId
  );

  if (result.changes === 0) {
    return jsonResponse({ error: "Not found" }, { status: 404 });
  }

  return jsonResponse({ success: true });
}

export async function DELETE(req: Request, context: RouteContext) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const { id } = await context.params;
  const userId = Number(id);
  if (!Number.isFinite(userId)) {
    return jsonResponse({ error: "Invalid user id" }, { status: 400 });
  }

  if (auth.user.id === userId) {
    return jsonResponse({ error: "You cannot delete your own account" }, { status: 400 });
  }

  const db = await getDb();
  const result = await db.run("DELETE FROM users WHERE id = ?", userId);
  if (result.changes === 0) {
    return jsonResponse({ error: "Not found" }, { status: 404 });
  }

  return jsonResponse({ success: true });
}
