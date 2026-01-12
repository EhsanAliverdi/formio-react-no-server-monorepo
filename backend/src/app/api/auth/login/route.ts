import { getDb } from "@/lib/db";
import { corsHeaders, createSession, jsonResponse, verifyPassword } from "@/lib/auth";

export const runtime = "nodejs";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!email || !password) {
    return jsonResponse({ error: "Missing email or password" }, { status: 400 });
  }

  const db = await getDb();
  const userRow = await db.get(
    "SELECT id, email, role, password_hash FROM users WHERE email = ? LIMIT 1",
    email
  );

  if (!userRow) {
    return jsonResponse({ error: "Invalid credentials" }, { status: 401 });
  }

  const ok = verifyPassword(password, String(userRow.password_hash));
  if (!ok) {
    return jsonResponse({ error: "Invalid credentials" }, { status: 401 });
  }

  const session = await createSession(Number(userRow.id));

  return jsonResponse({
    token: session.token,
    expiresAt: session.expiresAt,
    user: {
      id: Number(userRow.id),
      email: String(userRow.email),
      role: String(userRow.role),
    },
  });
}
