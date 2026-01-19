import { corsHeaders, jsonResponse, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildUserAvatarKey, encodeKeyPath, uploadObject } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB

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

export async function POST(req: Request) {
  const auth = await requireRole(req, ["admin", "editor", "viewer"]);
  if (!auth.ok) return auth.res;

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
    userId: auth.user.id,
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

  const user = await prisma.user.update({
    where: { id: auth.user.id },
    data: { avatarUrl: url },
  });

  return jsonResponse(
    {
      success: true,
      user,
      avatar_url: url,
      storage: "minio",
      key: obj.key,
      size: obj.size,
      type: obj.contentType,
    },
    { status: 201 }
  );
}
