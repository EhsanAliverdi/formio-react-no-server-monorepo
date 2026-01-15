import { corsHeaders, jsonResponse, requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { buildUserAvatarKey, encodeKeyPath, uploadObject } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB

type RouteContext = { params: Promise<{ id: string }> };

function isFile(x: unknown): x is File {
  return typeof File !== "undefined" && x instanceof File;
}

function getPublicOrigin(req: Request) {
  const forwardedProto = req.headers.get("x-forwarded-proto");
  const forwardedHost = req.headers.get("x-forwarded-host");
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const host = req.headers.get("host");
  if (host) {
    return `http://${host}`;
  }

  return new URL(req.url).origin;
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: Request, context: RouteContext) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const { id } = await context.params;
  const userId = Number(id);
  if (!Number.isFinite(userId)) {
    return jsonResponse({ error: "Invalid user id" }, { status: 400 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return jsonResponse({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const files: File[] = [];
  for (const [, value] of form.entries()) {
    if (isFile(value)) files.push(value);
  }

  if (files.length === 0) {
    return jsonResponse({ error: "No files uploaded" }, { status: 400 });
  }

  const f = files[0];
  const contentType = typeof f.type === "string" && f.type ? f.type : "application/octet-stream";

  if (!contentType.toLowerCase().startsWith("image/")) {
    return jsonResponse({ error: "Only image uploads are allowed" }, { status: 415 });
  }

  if (typeof f.size === "number" && f.size > MAX_AVATAR_BYTES) {
    return jsonResponse({ error: `Image too large (max ${MAX_AVATAR_BYTES} bytes)` }, { status: 413 });
  }

  const ab = await f.arrayBuffer();
  if (ab.byteLength > MAX_AVATAR_BYTES) {
    return jsonResponse({ error: `Image too large (max ${MAX_AVATAR_BYTES} bytes)` }, { status: 413 });
  }

  const bytes = new Uint8Array(ab);

  const key = buildUserAvatarKey({
    userId,
    originalName: f.name || "avatar",
    contentType,
  });

  const obj = await uploadObject({
    key,
    bytes,
    contentType,
    cacheControl: "public, max-age=31536000, immutable",
  });

  const origin = getPublicOrigin(req);
  const url = `${origin}/api/uploads/${encodeKeyPath(obj.key)}`;

  const db = await getDb();

  const exists = await db.get("SELECT id FROM users WHERE id = ?", userId);
  if (!exists) {
    return jsonResponse({ error: "Not found" }, { status: 404 });
  }

  await db.run("UPDATE users SET avatar_url = ? WHERE id = ?", url, userId);

  const row = await db.get(
    "SELECT id, email, role, is_active, created_at, display_name, preferred_name, first_name, middle_name, last_name, pronouns, date_of_birth, phone, job_title, department, company, website_url, bio, address_line1, address_line2, city, state, postal_code, country, timezone, locale, avatar_url FROM users WHERE id = ?",
    userId
  );

  return jsonResponse(
    {
      success: true,
      user: row,
      avatar_url: url,
      storage: "minio",
      key: obj.key,
      size: obj.size,
      type: obj.contentType,
    },
    { status: 201 }
  );
}
