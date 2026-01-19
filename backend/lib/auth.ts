import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export type Role = "admin" | "editor" | "viewer";

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

export const corsHeaders: Record<string, string> = {
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
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return { token: rawToken, expiresAt: expiresAt.toISOString() };
}

export async function deleteSessionByToken(rawToken: string) {
  const tokenHash = sha256Hex(rawToken);
  await prisma.session.deleteMany({ where: { tokenHash } });
}

export async function getUserFromRequest(req: Request): Promise<AuthedUser | null> {
  const token = extractBearerToken(req);
  if (!token) return null;

  const tokenHash = sha256Hex(token);
  const session = await prisma.session.findFirst({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session || !session.user) return null;

  const expires = session.expiresAt.getTime();
  if (!Number.isFinite(expires) || expires <= Date.now()) {
    await prisma.session.deleteMany({ where: { tokenHash } });
    return null;
  }

  const u = session.user;
  return {
    id: u.id,
    email: u.email,
    role: (u.role as Role) || "viewer",
    display_name: u.displayName ?? null,
    preferred_name: u.preferredName ?? null,
    first_name: u.firstName ?? null,
    last_name: u.lastName ?? null,
    avatar_url: u.avatarUrl ?? null,
  };
}

export async function requireRole(
  req: Request,
  allowed: Role[],
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

export async function requireAdmin(
  req: Request,
): Promise<{ ok: true; user: AuthedUser } | { ok: false; res: Response }> {
  return requireRole(req, ["admin"]);
}
