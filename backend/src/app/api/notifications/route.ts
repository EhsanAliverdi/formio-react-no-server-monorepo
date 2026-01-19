import { corsHeaders, jsonResponse, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const where: any = { userId: auth.user.id };
  if (unreadOnly) {
    where.readAt = null;
  }

  const [recipients, unreadCount] = await Promise.all([
    prisma.notificationRecipient.findMany({
      where,
      include: {
        notification: {
          include: {
            creator: true,
          },
        },
      },
      orderBy: [
        { readAt: "asc" },
        { notificationId: "desc" },
      ],
      take: limit,
      skip: offset,
    }),
    prisma.notificationRecipient.count({ where: { userId: auth.user.id, readAt: null } }),
  ]);

  const items = recipients.map((r) => {
    const n = r.notification;
    const creator = n.creator;
    const level =
      n.level ??
      (n.type === "error"
        ? "critical"
        : n.type === "warning"
        ? "high"
        : n.type === "success" || n.type === "info"
        ? "normal"
        : "normal");

    return {
      id: n.id,
      title: n.title,
      body: n.body,
      level,
      created_at: n.createdAt,
      created_by: n.createdBy,
      created_by_email: creator ? creator.email : null,
      created_by_avatar_url: creator ? creator.avatarUrl : null,
      delivered_at: r.deliveredAt,
      read_at: r.readAt,
    };
  });

  return jsonResponse({
    items,
    unread_count: unreadCount,
    limit,
    offset,
  });
}
