import crypto from "crypto";
import { getDb } from "@/lib/db";

type AuthedUser = {
  id: number;
  email: string;
  role: Role;
  display_name?: string | null;
  preferred_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
};

export type Role = "admin" | "editor" | "viewer";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  // Form.io file uploads may send additional X-* headers; allow a safe superset.
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Accept, X-Requested-With, X-Jwt-Token, X-File-Name, X-File-Size, X-File-Type",
};

export function jsonResponse(payload: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(payload), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...(init?.headers ?? {}),
    },
  });
}

function base64Url(bytes: Buffer) {
  return bytes
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function sha256Hex(value: string) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.scryptSync(password, salt, 32);
  return `scrypt$${salt.toString("hex")}$${derivedKey.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string) {
  const parts = stored.split("$");
  if (parts.length !== 3) return false;
  const [algo, saltHex, hashHex] = parts;
  if (algo !== "scrypt") return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = crypto.scryptSync(password, salt, expected.length);
  return crypto.timingSafeEqual(actual, expected);
}

export function extractBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function createSession(userId: number, ttlDays = 7) {
  const rawToken = base64Url(crypto.randomBytes(32));
  const tokenHash = sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000).toISOString();

  const db = await getDb();
  await db.run(
    "INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
    userId,
    tokenHash,
    expiresAt
  );

  return { token: rawToken, expiresAt };
}

export async function deleteSessionByToken(rawToken: string) {
  const db = await getDb();
  const tokenHash = sha256Hex(rawToken);
  await db.run("DELETE FROM sessions WHERE token_hash = ?", tokenHash);
}

export async function getUserFromRequest(req: Request): Promise<AuthedUser | null> {
  const token = extractBearerToken(req);
  if (!token) return null;

  const tokenHash = sha256Hex(token);
  const db = await getDb();

  const row = await db.get(
    `
      SELECT
        u.id as id,
        u.email as email,
        u.role as role,
        u.display_name as display_name,
        u.preferred_name as preferred_name,
        u.first_name as first_name,
        u.last_name as last_name,
        u.avatar_url as avatar_url,
        s.expires_at as expires_at
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?
      LIMIT 1
    `,
    tokenHash
  );

  if (!row) return null;

  const expires = Date.parse(String(row.expires_at));
  if (!Number.isFinite(expires) || expires <= Date.now()) {
    await db.run("DELETE FROM sessions WHERE token_hash = ?", tokenHash);
    return null;
  }

  return {
    id: Number(row.id),
    email: String(row.email),
    role: (String(row.role) as Role) || "viewer",
    display_name: (row.display_name as any) ?? null,
    preferred_name: (row.preferred_name as any) ?? null,
    first_name: (row.first_name as any) ?? null,
    last_name: (row.last_name as any) ?? null,
    avatar_url: (row.avatar_url as any) ?? null,
  };
}

export async function requireRole(
  req: Request,
  allowed: Role[]
): Promise<{ ok: true; user: AuthedUser } | { ok: false; res: Response }> {
  const user = await getUserFromRequest(req);
  if (!user) {
    return { ok: false, res: jsonResponse({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!allowed.includes(user.role)) {
    return { ok: false, res: jsonResponse({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true, user };
}

export async function requireAdmin(req: Request): Promise<{ ok: true; user: AuthedUser } | { ok: false; res: Response }> {
  return requireRole(req, ["admin"]);
}
