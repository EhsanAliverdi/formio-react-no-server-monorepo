import { corsHeaders, jsonResponse, requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";

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

  const db = await getDb();

  const perSource = Math.max(10, limit * 2);

  const submissions = (await db.all(
    `
      SELECT
        s.id as submission_id,
        s.form_id as form_id,
        f.name as form_name,
        s.user_id as user_id,
        u.email as user_email,
        u.display_name as user_display_name,
        u.avatar_url as user_avatar_url,
        s.submitted_at as submitted_at
      FROM form_submissions s
      LEFT JOIN forms f ON f.id = s.form_id
      LEFT JOIN users u ON u.id = s.user_id
      ORDER BY s.submitted_at DESC
      LIMIT ?
    `,
    [perSource]
  )) as unknown as Array<{
    submission_id: number;
    form_id: number;
    form_name: string | null;
    user_id: number | null;
    user_email: string | null;
    user_display_name: string | null;
    user_avatar_url: string | null;
    submitted_at: string;
  }>;

  const updated = (await db.all(
    `
      SELECT
        s.id as submission_id,
        s.form_id as form_id,
        f.name as form_name,
        s.user_id as user_id,
        u.email as user_email,
        u.display_name as user_display_name,
        u.avatar_url as user_avatar_url,
        s.updated_at as updated_at,
        s.updated_by as updated_by,
        ub.email as updated_by_email,
        ub.display_name as updated_by_display_name,
        ub.avatar_url as updated_by_avatar_url
      FROM form_submissions s
      LEFT JOIN forms f ON f.id = s.form_id
      LEFT JOIN users u ON u.id = s.user_id
      LEFT JOIN users ub ON ub.id = s.updated_by
      WHERE s.updated_at IS NOT NULL AND TRIM(s.updated_at) <> ''
      ORDER BY s.updated_at DESC
      LIMIT ?
    `,
    [perSource]
  )) as unknown as Array<{
    submission_id: number;
    form_id: number;
    form_name: string | null;
    user_id: number | null;
    user_email: string | null;
    user_display_name: string | null;
    user_avatar_url: string | null;
    updated_at: string;
    updated_by: number | null;
    updated_by_email: string | null;
    updated_by_display_name: string | null;
    updated_by_avatar_url: string | null;
  }>;

  const users = (await db.all(
    `
      SELECT
        id,
        email,
        role,
        created_at,
        display_name,
        avatar_url,
        is_active
      FROM users
      ORDER BY created_at DESC
      LIMIT ?
    `,
    [perSource]
  )) as unknown as Array<{
    id: number;
    email: string;
    role: string;
    created_at: string;
    display_name: string | null;
    avatar_url: string | null;
    is_active: number | null;
  }>;

  const notifications = (await db.all(
    `
      SELECT
        n.id as id,
        n.title as title,
        n.body as body,
        n.type as type,
        n.level as level,
        n.created_at as created_at,
        n.created_by as created_by,
        u.email as created_by_email,
        u.display_name as created_by_display_name,
        u.avatar_url as created_by_avatar_url
      FROM notifications n
      LEFT JOIN users u ON u.id = n.created_by
      ORDER BY n.created_at DESC
      LIMIT ?
    `,
    [perSource]
  )) as unknown as Array<{
    id: number;
    title: string;
    body: string;
    type: string;
    level: string;
    created_at: string;
    created_by: number | null;
    created_by_email: string | null;
    created_by_display_name: string | null;
    created_by_avatar_url: string | null;
  }>;

  const items: AdminActivityItem[] = [];

  for (const row of submissions) {
    const occurredAt = sqliteDateToIso(String(row.submitted_at ?? ""));

    const actor: ActivityActor | null = row.user_id
      ? {
          id: Number(row.user_id),
          email: String(row.user_email ?? ""),
          display_name: row.user_display_name == null ? null : String(row.user_display_name),
          avatar_url: row.user_avatar_url == null ? null : String(row.user_avatar_url),
        }
      : null;

    const formName = String(row.form_name ?? "Form");

    items.push({
      id: `submission:${row.submission_id}`,
      type: "submission",
      occurred_at: occurredAt,
      title: "New submission",
      summary: `${formName} received a submission`,
      actor,
      entity: {
        kind: "submission",
        id: Number(row.submission_id),
        form_id: Number(row.form_id),
      },
      link: "/admin/submissions",
      details: {
        submission_id: Number(row.submission_id),
        form_id: Number(row.form_id),
        form_name: formName,
      },
    });
  }

  for (const row of updated) {
    const occurredAt = sqliteDateToIso(String(row.updated_at ?? ""));

    const actor: ActivityActor | null = row.updated_by
      ? {
          id: Number(row.updated_by),
          email: String(row.updated_by_email ?? ""),
          display_name:
            row.updated_by_display_name == null
              ? null
              : String(row.updated_by_display_name),
          avatar_url:
            row.updated_by_avatar_url == null
              ? null
              : String(row.updated_by_avatar_url),
        }
      : null;

    const formName = String(row.form_name ?? "Form");

    items.push({
      id: `submission_updated:${row.submission_id}`,
      type: "submission_updated",
      occurred_at: occurredAt,
      title: "Submission updated",
      summary: `${formName} submission was edited`,
      actor,
      entity: {
        kind: "submission",
        id: Number(row.submission_id),
        form_id: Number(row.form_id),
      },
      link: "/admin/submissions",
      details: {
        submission_id: Number(row.submission_id),
        form_id: Number(row.form_id),
        form_name: formName,
      },
    });
  }

  for (const row of users) {
    const occurredAt = sqliteDateToIso(String(row.created_at ?? ""));

    const actor: ActivityActor = {
      id: Number(row.id),
      email: String(row.email ?? ""),
      display_name: row.display_name == null ? null : String(row.display_name),
      avatar_url: row.avatar_url == null ? null : String(row.avatar_url),
    };

    items.push({
      id: `user_created:${row.id}`,
      type: "user_created",
      occurred_at: occurredAt,
      title: "User created",
      summary: `${actor.email} was created`,
      actor,
      entity: {
        kind: "user",
        id: Number(row.id),
      },
      link: "/admin/users",
      details: {
        user_id: Number(row.id),
        email: actor.email,
        role: String(row.role ?? ""),
        is_active: row.is_active == null ? null : Number(row.is_active),
      },
    });
  }

  for (const row of notifications) {
    const occurredAt = sqliteDateToIso(String(row.created_at ?? ""));

    const actor: ActivityActor | null = row.created_by
      ? {
          id: Number(row.created_by),
          email: String(row.created_by_email ?? ""),
          display_name:
            row.created_by_display_name == null
              ? null
              : String(row.created_by_display_name),
          avatar_url:
            row.created_by_avatar_url == null
              ? null
              : String(row.created_by_avatar_url),
        }
      : null;

    items.push({
      id: `notification_sent:${row.id}`,
      type: "notification_sent",
      occurred_at: occurredAt,
      title: "Notification sent",
      summary: String(row.title ?? "Notification"),
      actor,
      entity: {
        kind: "notification",
        id: Number(row.id),
      },
      link: "/admin/notifications",
      details: {
        notification_id: Number(row.id),
        title: String(row.title ?? ""),
        body: String(row.body ?? ""),
        type: String(row.type ?? ""),
        level: String(row.level ?? ""),
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
