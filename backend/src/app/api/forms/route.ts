import { corsHeaders, getUserFromRequest, jsonResponse, requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { listAccessibleForms } from "@/lib/formsAccess";

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

  const visibility = body.visibility === "restricted" ? "restricted" : "public";
  const allowedRolesRaw = Array.isArray(body.allowed_roles) ? body.allowed_roles : [];
  const allowedRoles = allowedRolesRaw.filter(
    (r: unknown) => r === "admin" || r === "editor" || r === "viewer"
  ) as Array<"admin" | "editor" | "viewer">;
  const allowedUserIdsRaw = Array.isArray(body.allowed_user_ids) ? body.allowed_user_ids : [];
  const allowedUserIds = allowedUserIdsRaw
    .map((id: unknown) => Number(id))
    .filter((id: number) => Number.isFinite(id) && id > 0);

  const result = await db.run(
    "INSERT INTO forms (name, json, allow_anonymous_submit, visibility) VALUES (?, ?, ?, ?)",
    body.name,
    JSON.stringify(body.json),
    allowAnonymousSubmit,
    visibility
  );

  const formId = Number(result.lastID);

  if (visibility === "restricted") {
    for (const role of allowedRoles) {
      await db.run(
        "INSERT OR IGNORE INTO form_allowed_roles (form_id, role) VALUES (?, ?)",
        formId,
        role
      );
    }

    // Only admins can assign to specific users.
    if (auth.user.role === "admin") {
      for (const userId of allowedUserIds) {
        await db.run(
          "INSERT OR IGNORE INTO form_allowed_users (form_id, user_id) VALUES (?, ?)",
          formId,
          userId
        );
      }
    }
  }

  return jsonResponse({ success: true, id: formId });
}

export async function GET(req: Request) {
  const db = await getDb();

  const mode = new URL(req.url).searchParams.get("mode");
  const isPublicMode = mode === "public";

  const user = await getUserFromRequest(req);

  // Admin/editor can see all forms (management UI).
  if (!isPublicMode && user && (user.role === "admin" || user.role === "editor")) {
    const forms = await db.all(
      "SELECT id, name, json, allow_anonymous_submit FROM forms ORDER BY id DESC"
    );
    return jsonResponse(forms);
  }

  const forms = await listAccessibleForms(db, user ? { id: user.id, role: user.role } : null);
  return jsonResponse(forms);
}
