import { corsHeaders, jsonResponse, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type ActivityActor = {
  id: number;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
};

export type AdminActivityItem = {
  id: string;
  type: "submission" | "submission_updated" | "user_created" | "notification_sent";
  occurred_at: string | null;
  title: string;
  summary: string;
  actor: ActivityActor | null;
  entity: {
    kind: "submission" | "user" | "notification";
    id: number;
    form_id?: number;
  };
  link: string | null;
  details: Record<string, unknown>;
};

function clampInt(value: string | null, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  return Math.max(min, Math.min(max, i));
}

function sqliteDateToIso(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;

  // SQLite datetime('now') gives: YYYY-MM-DD HH:MM:SS
  // Convert to a safe ISO string. Treat as UTC for consistency.
  const isoGuess = raw.includes("T")
    ? raw
    : raw.replace(" ", "T") + "Z";

  const d = new Date(isoGuess);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const url = new URL(req.url);
  const limit = clampInt(url.searchParams.get("limit"), 10, 1, 50);

  const perSource = Math.max(10, limit * 2);

  const [submissions, updated, users, notifications] = await Promise.all([
    prisma.formSubmission.findMany({
      include: { form: true, user: true },
      orderBy: { submittedAt: "desc" },
      take: perSource,
    }),
    prisma.formSubmission.findMany({
      where: { updatedAt: { not: null } },
      include: { form: true },
      orderBy: { updatedAt: "desc" },
      take: perSource,
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: perSource,
    }),
    prisma.notification.findMany({
      include: { creator: true },
      orderBy: { createdAt: "desc" },
      take: perSource,
    }),
  ]);

  // Preload updated-by users for updated submissions
  const updatedByIds = Array.from(
    new Set(
      updated
        .map((s: { updatedBy: number | null }) => s.updatedBy)
        .filter((id: number | null): id is number => id != null),
    ),
  );
  const updatedByUsers = updatedByIds.length
    ? await prisma.user.findMany({ where: { id: { in: updatedByIds } } })
    : [];
  const updatedByMap = new Map<number, (typeof updatedByUsers)[number]>(
    updatedByUsers.map((u: (typeof updatedByUsers)[number]) => [u.id, u]),
  );

  const items: AdminActivityItem[] = [];

  for (const s of submissions) {
    const occurredAt = s.submittedAt.toISOString();

    const actor: ActivityActor | null = s.user
      ? {
        id: s.user.id,
        email: s.user.email,
        display_name: s.user.displayName ?? null,
        avatar_url: s.user.avatarUrl ?? null,
      }
      : null;

    const formName = s.form?.name ?? "Form";

    items.push({
      id: `submission:${s.id}`,
      type: "submission",
      occurred_at: occurredAt,
      title: "New submission",
      summary: `${formName} received a submission`,
      actor,
      entity: {
        kind: "submission",
        id: s.id,
        form_id: s.formId,
      },
      link: "/admin/submissions",
      details: {
        submission_id: s.id,
        form_id: s.formId,
        form_name: formName,
      },
    });
  }

  for (const s of updated) {
    if (!s.updatedAt) continue;
    const occurredAt = s.updatedAt.toISOString();

    const updater = s.updatedBy != null ? updatedByMap.get(s.updatedBy) : undefined;
    const actor: ActivityActor | null = updater
      ? {
        id: updater.id,
        email: updater.email,
        display_name: updater.displayName ?? null,
        avatar_url: updater.avatarUrl ?? null,
      }
      : null;

    const formName = s.form?.name ?? "Form";

    items.push({
      id: `submission_updated:${s.id}`,
      type: "submission_updated",
      occurred_at: occurredAt,
      title: "Submission updated",
      summary: `${formName} submission was edited`,
      actor,
      entity: {
        kind: "submission",
        id: s.id,
        form_id: s.formId,
      },
      link: "/admin/submissions",
      details: {
        submission_id: s.id,
        form_id: s.formId,
        form_name: formName,
      },
    });
  }

  for (const u of users) {
    const occurredAt = u.createdAt.toISOString();

    const actor: ActivityActor = {
      id: u.id,
      email: u.email,
      display_name: u.displayName ?? null,
      avatar_url: u.avatarUrl ?? null,
    };

    items.push({
      id: `user_created:${u.id}`,
      type: "user_created",
      occurred_at: occurredAt,
      title: "User created",
      summary: `${actor.email} was created`,
      actor,
      entity: {
        kind: "user",
        id: u.id,
      },
      link: "/admin/users",
      details: {
        user_id: u.id,
        email: actor.email,
        role: u.role,
        is_active: u.isActive ? 1 : 0,
      },
    });
  }

  for (const n of notifications) {
    const occurredAt = n.createdAt.toISOString();

    const creator = n.creator;
    const actor: ActivityActor | null = creator
      ? {
        id: creator.id,
        email: creator.email,
        display_name: creator.displayName ?? null,
        avatar_url: creator.avatarUrl ?? null,
      }
      : null;

    items.push({
      id: `notification_sent:${n.id}`,
      type: "notification_sent",
      occurred_at: occurredAt,
      title: "Notification sent",
      summary: n.title ?? "Notification",
      actor,
      entity: {
        kind: "notification",
        id: n.id,
      },
      link: "/admin/notifications",
      details: {
        notification_id: n.id,
        title: n.title,
        body: n.body,
        type: n.type,
        level: n.level,
      },
    });
  }

  items.sort((a, b) => {
    const at = a.occurred_at ? new Date(a.occurred_at).getTime() : 0;
    const bt = b.occurred_at ? new Date(b.occurred_at).getTime() : 0;
    return bt - at;
  });

  const limited = items.slice(0, limit);

  return jsonResponse({
    items: limited,
  });
}
