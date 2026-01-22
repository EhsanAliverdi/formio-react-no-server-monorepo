import { apiFetch, normalizeUploadUrl } from "./apiClient";

export type AdminActivityActor = {
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
  actor: AdminActivityActor | null;
  entity: {
    kind: "submission" | "user" | "notification";
    id: number;
    form_id?: number;
  };
  link: string | null;
  details: Record<string, unknown>;
};

export type AdminActivityResponse = {
  items: AdminActivityItem[];
};

export async function getAdminActivity(limit: number = 10): Promise<AdminActivityResponse> {
  const sp = new URLSearchParams({ limit: String(limit) });
  const res = await apiFetch(`/api/admin/activity?${sp.toString()}`);
  const payload = (await res.json()) as AdminActivityResponse;
  if (Array.isArray(payload.items)) {
    payload.items = payload.items.map((item) => {
      if (!item.actor) return item;
      const avatarUrl =
        typeof item.actor.avatar_url === "string" ? normalizeUploadUrl(item.actor.avatar_url) : item.actor.avatar_url;
      if (avatarUrl === item.actor.avatar_url) return item;
      return {
        ...item,
        actor: {
          ...item.actor,
          avatar_url: avatarUrl,
        },
      };
    });
  }
  return payload;
}
