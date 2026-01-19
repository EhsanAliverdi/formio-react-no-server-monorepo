import { corsHeaders, hashPassword, jsonResponse, requireAdmin, type Role } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const url = new URL(req.url);
  const search = (url.searchParams.get("search") ?? "").trim();
  const activeOnly = (url.searchParams.get("active") ?? "").trim() === "1";

  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") ?? 200) || 200));

  const rolesParam = (url.searchParams.get("roles") ?? "").trim();
  const rolesRaw = rolesParam
    ? rolesParam
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean)
    : [];

  const roles = rolesRaw.filter((r): r is Role => r === "admin" || r === "editor" || r === "viewer");

  const where: any = {};

  if (activeOnly) {
    where.isActive = true;
  }

  if (roles.length > 0) {
    where.role = { in: roles };
  }

  if (search) {
    const like = search;
    where.OR = [
      { email: { contains: like, mode: "insensitive" } },
      { displayName: { contains: like, mode: "insensitive" } },
      { preferredName: { contains: like, mode: "insensitive" } },
      { firstName: { contains: like, mode: "insensitive" } },
      { lastName: { contains: like, mode: "insensitive" } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { email: "asc" },
    take: limit,
  });

  // Map Prisma model (camelCase) to the original JSON shape (snake_case)
  const dto = users.map((u: any) => ({
    id: u.id,
    email: u.email,
    role: u.role as Role,
    is_active: u.isActive,
    created_at: u.createdAt,
    display_name: u.displayName ?? null,
    preferred_name: u.preferredName ?? null,
    first_name: u.firstName ?? null,
    middle_name: u.middleName ?? null,
    last_name: u.lastName ?? null,
    pronouns: u.pronouns ?? null,
    date_of_birth: u.dateOfBirth ?? null,
    phone: u.phone ?? null,
    job_title: u.jobTitle ?? null,
    department: u.department ?? null,
    company: u.company ?? null,
    website_url: u.websiteUrl ?? null,
    bio: u.bio ?? null,
    address_line1: u.addressLine1 ?? null,
    address_line2: u.addressLine2 ?? null,
    city: u.city ?? null,
    state: u.state ?? null,
    postal_code: u.postalCode ?? null,
    country: u.country ?? null,
    timezone: u.timezone ?? null,
    locale: u.locale ?? null,
    avatar_url: u.avatarUrl ?? null,
  }));

  return jsonResponse(dto);
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

  try {
    const created = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        isActive: Boolean(isActive),
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
        avatarUrl,
      },
      select: { id: true },
    });

    return jsonResponse({ success: true, id: created.id });
  } catch (e) {
    if (e && typeof e === "object" && (e as any).code === "P2002") {
      return jsonResponse({ error: "Email already exists" }, { status: 409 });
    }
    const message = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: "Failed to create user" }, { status: 500 });
  }
}
