import { prisma } from "@/lib/prisma";
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

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return jsonResponse({ error: "Invalid credentials" }, { status: 401 });
  }

  const ok = verifyPassword(password, String(user.passwordHash));
  if (!ok) {
    return jsonResponse({ error: "Invalid credentials" }, { status: 401 });
  }

  const session = await createSession(user.id);

  return jsonResponse({
    token: session.token,
    expiresAt: session.expiresAt,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      display_name: user.displayName ?? null,
      preferred_name: user.preferredName ?? null,
      first_name: user.firstName ?? null,
      last_name: user.lastName ?? null,
      avatar_url: user.avatarUrl ?? null,
    },
  });
}
