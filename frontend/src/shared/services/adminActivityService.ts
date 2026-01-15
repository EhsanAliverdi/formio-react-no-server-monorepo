import { apiFetch } from "./apiClient";

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
  return res.json();
}
