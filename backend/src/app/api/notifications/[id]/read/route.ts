import { corsHeaders, jsonResponse, requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ["admin", "editor", "viewer"]);
  if (!auth.ok) return auth.res;

  const { id } = await ctx.params;
  const notificationId = Number(id);
  if (!Number.isFinite(notificationId) || notificationId <= 0) {
    return jsonResponse({ error: "Invalid notification id" }, { status: 400 });
  }

  const db = await getDb();

  const result = await db.run(
    "UPDATE notification_recipients SET read_at = datetime('now') WHERE notification_id = ? AND user_id = ? AND read_at IS NULL",
    notificationId,
    auth.user.id
  );

  if (Number(result?.changes ?? 0) === 0) {
    // Either already read or not a recipient.
    const exists = await db.get(
      "SELECT 1 FROM notification_recipients WHERE notification_id = ? AND user_id = ?",
      notificationId,
      auth.user.id
    );

    if (!exists) {
      return jsonResponse({ error: "Not found" }, { status: 404 });
    }
  }

  return jsonResponse({ success: true });
}
