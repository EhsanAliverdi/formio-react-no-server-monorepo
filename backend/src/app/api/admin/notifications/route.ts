import { corsHeaders, jsonResponse, requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

type Role = "admin" | "editor" | "viewer";

type NotificationLevel = "low" | "normal" | "high" | "critical";

function normalizeLevel(value: unknown): NotificationLevel {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (v === "low" || v === "normal" || v === "high" || v === "critical") return v;

  // Back-compat mapping from old values.
  if (v === "error") return "critical";
  if (v === "warning") return "high";
  if (v === "success" || v === "info") return "normal";

  return "normal";
}

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const url = new URL(req.url);
  const limit = Math.max(1, Math.min(200, Number(url.searchParams.get("limit") ?? 50) || 50));
  const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0) || 0);

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
        (
          SELECT COUNT(*)
          FROM notification_recipients r
          WHERE r.notification_id = n.id
        ) as recipient_count,
        (
          SELECT COUNT(*)
          FROM notification_recipients r
          WHERE r.notification_id = n.id AND r.read_at IS NOT NULL
        ) as read_count
      FROM notifications n
      LEFT JOIN users cu ON cu.id = n.created_by
      ORDER BY n.id DESC
      LIMIT ? OFFSET ?
    `,
    limit,
    offset
  );

  return jsonResponse({ items: rows ?? [], limit, offset });
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const body = await req.json().catch(() => null);

  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const message = typeof body?.body === "string" ? body.body.trim() : "";
  const level = normalizeLevel(body?.level ?? body?.type);

  const allUsers = Boolean(body?.all_users);

  const rolesRaw: unknown[] = Array.isArray(body?.roles) ? (body.roles as unknown[]) : [];
  const roles = rolesRaw
    .map((x) => (typeof x === "string" ? x.trim().toLowerCase() : ""))
    .filter((r): r is Role => r === "admin" || r === "editor" || r === "viewer");

  const userIdsRaw: unknown[] = Array.isArray(body?.user_ids) ? (body.user_ids as unknown[]) : [];
  const userIds = userIdsRaw
    .map((x: unknown) => Number(x))
    .filter((n: number) => Number.isFinite(n) && n > 0);

  if (!title || !message) {
    return jsonResponse({ error: "Missing title or body" }, { status: 400 });
  }

  if (!allUsers && roles.length === 0 && userIds.length === 0) {
    return jsonResponse({ error: "Choose at least one role or user, or set all_users" }, { status: 400 });
  }

  const db = await getDb();

  // Create the notification
  const insert = await db.run(
    "INSERT INTO notifications (title, body, type, level, created_by) VALUES (?, ?, ?, ?, ?)",
    title,
    message,
    "info",
    level,
    auth.user.id
  );

  const notificationId = Number(insert.lastID);

  // Resolve recipients
  const recipientSet = new Set<number>();

  if (allUsers) {
    const rows = (await db.all("SELECT id FROM users WHERE COALESCE(is_active, 1) = 1")) as Array<{ id: number }>;
    for (const r of rows ?? []) {
      const id = Number(r.id);
      if (Number.isFinite(id) && id > 0) recipientSet.add(id);
    }
  } else {
    for (const id of userIds) recipientSet.add(id);

    if (roles.length > 0) {
      const placeholders = roles.map(() => "?").join(", ");
      const roleRows = (await db.all(
        `SELECT id FROM users WHERE COALESCE(is_active, 1) = 1 AND role IN (${placeholders})`,
        ...roles
      )) as Array<{ id: number }>;
      for (const r of roleRows ?? []) {
        const id = Number(r.id);
        if (Number.isFinite(id) && id > 0) recipientSet.add(id);
      }
    }
  }

  const recipients = Array.from(recipientSet);

  let insertedCount = 0;
  for (const userId of recipients) {
    const r = await db.run(
      "INSERT OR IGNORE INTO notification_recipients (notification_id, user_id) VALUES (?, ?)",
      notificationId,
      userId
    );
    insertedCount += Number(r?.changes ?? 0);
  }

  return jsonResponse({
    success: true,
    notification_id: notificationId,
    recipient_count: insertedCount,
  });
}
