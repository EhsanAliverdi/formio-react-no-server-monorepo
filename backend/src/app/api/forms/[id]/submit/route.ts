import { corsHeaders, getUserFromRequest, jsonResponse } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const formId = Number(id);
  if (!Number.isFinite(formId)) {
    return jsonResponse({ error: "Invalid form id" }, { status: 400 });
  }

  const db = await getDb();
  const formRow = await db.get("SELECT id, allow_anonymous_submit FROM forms WHERE id = ?", formId);
  if (!formRow) {
    return jsonResponse({ error: "Not found" }, { status: 404 });
  }

  const allowAnonymous = Number(formRow.allow_anonymous_submit ?? 1) ? 1 : 0;

  const user = await getUserFromRequest(req);
  if (!allowAnonymous && !user) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await req.json().catch(() => null);
  const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const data = obj && Object.prototype.hasOwnProperty.call(obj, "data") ? obj.data : body;

  if (!data || typeof data !== "object") {
    return jsonResponse({ error: "Missing submission data" }, { status: 400 });
  }

  const result = await db.run(
    "INSERT INTO form_submissions (form_id, user_id, data) VALUES (?, ?, ?)",
    formId,
    user ? user.id : null,
    JSON.stringify(data)
  );

  return jsonResponse({ success: true, id: result.lastID });
}
