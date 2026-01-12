import { corsHeaders, jsonResponse, requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(req: Request) {
  const auth = await requireRole(req, ["admin", "editor"]);
  if (!auth.ok) return auth.res;

  const db = await getDb();
  const body = await req.json();
  if (!body.name || !body.json) {
    return jsonResponse({ error: "Missing name or json" }, { status: 400 });
  }

  const allowRaw = body.allow_anonymous_submit;
  const allowAnonymousSubmit =
    typeof allowRaw === "boolean"
      ? allowRaw
        ? 1
        : 0
      : typeof allowRaw === "number"
        ? allowRaw
          ? 1
          : 0
        : 1;

  const result = await db.run(
    "INSERT INTO forms (name, json, allow_anonymous_submit) VALUES (?, ?, ?)",
    body.name,
    JSON.stringify(body.json),
    allowAnonymousSubmit
  );
  return jsonResponse({ success: true, id: result.lastID });
}

export async function GET() {
  const db = await getDb();
  const forms = await db.all("SELECT id, name, json, allow_anonymous_submit FROM forms ORDER BY id DESC");
  return jsonResponse(forms);
}
