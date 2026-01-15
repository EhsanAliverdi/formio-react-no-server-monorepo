import { corsHeaders, jsonResponse, requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: Request) {
  const auth = await requireRole(req, ["admin", "editor", "viewer"]);
  if (!auth.ok) return auth.res;

  const url = new URL(req.url);
  const unreadOnly = (url.searchParams.get("unread") ?? "").trim() === "1";
  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") ?? 50) || 50));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0) || 0);

  const whereUnread = unreadOnly ? "AND r.read_at IS NULL" : "";

  const db = await getDb();

  const rows = await db.all(
    `
      SELECT
        n.id as id,
        n.title as title,
        n.body as body,
        COALESCE(n.level, CASE
          WHEN n.type = 'error' THEN 'critical'
          WHEN n.type = 'warning' THEN 'high'
          WHEN n.type = 'success' THEN 'normal'
          WHEN n.type = 'info' THEN 'normal'
          ELSE 'normal'
        END) as level,
        n.created_at as created_at,
        n.created_by as created_by,
        cu.email as created_by_email,
        cu.avatar_url as created_by_avatar_url,
        r.delivered_at as delivered_at,
        r.read_at as read_at
      FROM notification_recipients r
      JOIN notifications n ON n.id = r.notification_id
      LEFT JOIN users cu ON cu.id = n.created_by
      WHERE r.user_id = ?
        ${whereUnread}
      ORDER BY
        CASE WHEN r.read_at IS NULL THEN 0 ELSE 1 END,
        n.id DESC
      LIMIT ? OFFSET ?
    `,
    auth.user.id,
    limit,
    offset
  );

  const unreadRow = await db.get<{ c: number }>(
    "SELECT COUNT(*) as c FROM notification_recipients WHERE user_id = ? AND read_at IS NULL",
    auth.user.id
  );

  return jsonResponse({
    items: rows ?? [],
    unread_count: Number(unreadRow?.c ?? 0),
    limit,
    offset,
  });
}
