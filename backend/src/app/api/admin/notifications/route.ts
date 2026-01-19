import { corsHeaders, jsonResponse, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const notifications = await prisma.notification.findMany({
    include: {
      creator: true,
      recipients: true,
    },
    orderBy: { id: "desc" },
    take: limit,
    skip: offset,
  });

  const items = notifications.map((n) => {
    const level: string =
      n.level ??
      (n.type === "error"
        ? "critical"
        : n.type === "warning"
        ? "high"
        : n.type === "success" || n.type === "info"
        ? "normal"
        : "normal");

    const recipientCount = n.recipients.length;
    const readCount = n.recipients.filter((r) => r.readAt !== null).length;

    return {
      id: n.id,
      title: n.title,
      body: n.body,
      level,
      created_at: n.createdAt,
      created_by: n.createdBy,
      created_by_email: n.creator ? n.creator.email : null,
      created_by_avatar_url: n.creator ? n.creator.avatarUrl : null,
      recipient_count: recipientCount,
      read_count: readCount,
    };
  });

  return jsonResponse({ items, limit, offset });
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

  // Create the notification
  const notification = await prisma.notification.create({
    data: {
      title,
      body: message,
      type: "info",
      level,
      createdBy: auth.user.id,
    },
  });

  // Resolve recipients
  const recipientSet = new Set<number>();

  if (allUsers) {
    const users = await prisma.user.findMany({ where: { isActive: true } });
    for (const u of users) {
      recipientSet.add(u.id);
    }
  } else {
    if (userIds.length > 0) {
      const users = await prisma.user.findMany({ where: { id: { in: userIds } } });
      for (const u of users) recipientSet.add(u.id);
    }

    if (roles.length > 0) {
      const roleUsers = await prisma.user.findMany({
        where: {
          isActive: true,
          role: { in: roles },
        },
      });
      for (const u of roleUsers) recipientSet.add(u.id);
    }
  }

  const recipients = Array.from(recipientSet);

  let insertedCount = 0;
  if (recipients.length > 0) {
    const result = await prisma.notificationRecipient.createMany({
      data: recipients.map((userId) => ({ notificationId: notification.id, userId })),
      skipDuplicates: true,
    });
    insertedCount = result.count;
  }

  return jsonResponse({
    success: true,
    notification_id: notification.id,
    recipient_count: insertedCount,
  });
}
