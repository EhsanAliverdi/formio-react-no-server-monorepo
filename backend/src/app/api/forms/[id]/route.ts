import { corsHeaders, getUserFromRequest, jsonResponse, requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { canUserAccessForm } from "@/lib/formsAccess";

type RouteContext = { params: Promise<{ id: string }> };

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(_req: Request, context: RouteContext) {
  const db = await getDb();
  const { id } = await context.params;

  const user = await getUserFromRequest(_req);
  const isPrivileged = user && (user.role === "admin" || user.role === "editor");

  const row = await db.get("SELECT * FROM forms WHERE id=?", id);

  if (!row) {
    return jsonResponse({ error: "Not found" }, { status: 404 });
  }

  const formId = Number(row.id);
  if (!isPrivileged) {
    const allowed = await canUserAccessForm(
      db,
      formId,
      user ? { id: user.id, role: user.role } : null
    );
    if (!allowed) {
      return jsonResponse({ error: user ? "Forbidden" : "Unauthorized" }, { status: user ? 403 : 401 });
    }
  }

  let allowedRoles: string[] | undefined;
  let allowedUserIds: number[] | undefined;
  if (isPrivileged) {
    const rolesRows = (await db.all(
      "SELECT role FROM form_allowed_roles WHERE form_id = ? ORDER BY role ASC",
      formId
    )) as Array<{ role: string }>;
    allowedRoles = rolesRows.map((r) => String(r.role));

    const usersRows = (await db.all(
      "SELECT user_id FROM form_allowed_users WHERE form_id = ? ORDER BY user_id ASC",
      formId
    )) as Array<{ user_id: number }>;
    allowedUserIds = usersRows.map((r) => Number(r.user_id));
  }

  return jsonResponse({
    id: row.id,
    name: row.name,
    json: JSON.parse(row.json),
    allow_anonymous_submit: typeof row.allow_anonymous_submit === "number" ? row.allow_anonymous_submit : Number(row.allow_anonymous_submit ?? 1) ? 1 : 0,
    visibility: row.visibility === "restricted" ? "restricted" : "public",
    ...(isPrivileged ? { allowed_roles: allowedRoles ?? [], allowed_user_ids: allowedUserIds ?? [] } : {}),
  });
}

export async function PUT(req: Request, context: RouteContext) {
  const auth = await requireRole(req, ["admin", "editor"]);
  if (!auth.ok) return auth.res;

  const db = await getDb();
  const { id } = await context.params;
  const body: unknown = await req.json().catch(() => null);
  const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : null;

  const formId = Number(id);
  if (!Number.isFinite(formId)) {
    return jsonResponse({ error: "Invalid form id" }, { status: 400 });
  }

  const updates: string[] = [];
  const params: Array<string | number> = [];

  if (typeof obj?.name === "string") {
    updates.push("name = ?");
    params.push(obj.name);
  }

  if (obj && Object.prototype.hasOwnProperty.call(obj, "json")) {
    updates.push("json = ?");
    params.push(JSON.stringify(obj.json));
  }

  const hasAllow = !!obj && Object.prototype.hasOwnProperty.call(obj, "allow_anonymous_submit");
  if (hasAllow) {
    const allowRaw = obj.allow_anonymous_submit;
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
    updates.push("allow_anonymous_submit = ?");
    params.push(allowAnonymousSubmit);
  }

  const hasVisibility = !!obj && Object.prototype.hasOwnProperty.call(obj, "visibility");
  if (hasVisibility) {
    const visRaw = obj.visibility;
    const visibility = visRaw === "restricted" ? "restricted" : "public";
    updates.push("visibility = ?");
    params.push(visibility);
  }

  const hasAllowedRoles =
    !!obj && Object.prototype.hasOwnProperty.call(obj, "allowed_roles");
  const hasAllowedUsers =
    !!obj && Object.prototype.hasOwnProperty.call(obj, "allowed_user_ids");

  if (updates.length === 0 && !hasAllowedRoles && !hasAllowedUsers) {
    return jsonResponse({ error: "No changes" }, { status: 400 });
  }

  if (updates.length > 0) {
    await db.run(`UPDATE forms SET ${updates.join(", ")} WHERE id=?`, ...params, formId);
  }

  // If visibility is set to public, clear assignments.
  if (hasVisibility) {
    const visRaw = obj?.visibility;
    const visibility = visRaw === "restricted" ? "restricted" : "public";
    if (visibility === "public") {
      await db.run("DELETE FROM form_allowed_roles WHERE form_id = ?", formId);
      await db.run("DELETE FROM form_allowed_users WHERE form_id = ?", formId);
    }
  }

  if (hasAllowedRoles) {
    const allowedRolesRaw = Array.isArray(obj?.allowed_roles) ? (obj?.allowed_roles as unknown[]) : [];
    const allowedRoles = allowedRolesRaw.filter(
      (r: unknown) => r === "admin" || r === "editor" || r === "viewer"
    ) as Array<"admin" | "editor" | "viewer">;

    await db.run("DELETE FROM form_allowed_roles WHERE form_id = ?", formId);
    for (const role of allowedRoles) {
      await db.run(
        "INSERT OR IGNORE INTO form_allowed_roles (form_id, role) VALUES (?, ?)",
        formId,
        role
      );
    }
  }

  if (hasAllowedUsers) {
    if (auth.user.role !== "admin") {
      return jsonResponse({ error: "Only admins can assign forms to specific users" }, { status: 403 });
    }

    const allowedUserIdsRaw = Array.isArray(obj?.allowed_user_ids) ? (obj?.allowed_user_ids as unknown[]) : [];
    const allowedUserIds = allowedUserIdsRaw
      .map((v: unknown) => Number(v))
      .filter((n: number) => Number.isFinite(n) && n > 0);

    await db.run("DELETE FROM form_allowed_users WHERE form_id = ?", formId);
    for (const userId of allowedUserIds) {
      await db.run(
        "INSERT OR IGNORE INTO form_allowed_users (form_id, user_id) VALUES (?, ?)",
        formId,
        userId
      );
    }
  }

  return jsonResponse({ success: true });
}

export async function DELETE(_req: Request, context: RouteContext) {
  const auth = await requireRole(_req, ["admin", "editor"]);
  if (!auth.ok) return auth.res;

  const db = await getDb();
  const { id } = await context.params;
  const result = await db.run("DELETE FROM forms WHERE id=?", id);
  if (result.changes === 0) {
    return jsonResponse({ error: "Not found" }, { status: 404 });
  }
  return jsonResponse({ success: true });
}
