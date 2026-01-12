import { corsHeaders, jsonResponse, requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(_req: Request, context: any) {
  const db = await getDb();
  const { id } = await context.params;

  const row = await db.get("SELECT * FROM forms WHERE id=?", id);

  if (!row) {
    return jsonResponse({ error: "Not found" }, { status: 404 });
  }

  return jsonResponse({
    id: row.id,
    name: row.name,
    json: JSON.parse(row.json),
    allow_anonymous_submit: typeof row.allow_anonymous_submit === "number" ? row.allow_anonymous_submit : Number(row.allow_anonymous_submit ?? 1) ? 1 : 0,
  });
}

export async function PUT(req: Request, context: any) {
  const auth = await requireRole(req, ["admin", "editor"]);
  if (!auth.ok) return auth.res;

  const db = await getDb();
  const { id } = await context.params;
  const body = await req.json();

  const updates: string[] = [];
  const params: Array<string | number> = [];

  if (typeof body?.name === "string") {
    updates.push("name = ?");
    params.push(body.name);
  }

  if (body?.json !== undefined) {
    updates.push("json = ?");
    params.push(JSON.stringify(body.json));
  }

  const hasAllow = !!body && typeof body === "object" && Object.prototype.hasOwnProperty.call(body, "allow_anonymous_submit");
  if (hasAllow) {
    const allowRaw = (body as any).allow_anonymous_submit;
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

  if (updates.length === 0) {
    return jsonResponse({ error: "No changes" }, { status: 400 });
  }

  await db.run(`UPDATE forms SET ${updates.join(", ")} WHERE id=?`, ...params, id);

  return jsonResponse({ success: true });
}

export async function DELETE(_req: Request, context: any) {
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
