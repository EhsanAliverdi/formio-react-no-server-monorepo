import { apiFetch, normalizeUploadUrl } from "./apiClient";

export type NotificationLevel = "low" | "normal" | "high" | "critical";

export type NotificationRow = {
  id: number;
  title: string;
  body: string;
  level: NotificationLevel;
  created_at: string;
  created_by: number | null;
  created_by_email: string | null;
  created_by_avatar_url?: string | null;
  delivered_at: string;
  read_at: string | null;
};

export type MyNotificationsResponse = {
  items: NotificationRow[];
  unread_count: number;
  limit: number;
  offset: number;
};

export async function getMyNotifications(opts?: { unreadOnly?: boolean; limit?: number; offset?: number }) {
  const params = new URLSearchParams();
  if (opts?.unreadOnly) params.set("unread", "1");
  if (typeof opts?.limit === "number") params.set("limit", String(opts.limit));
  if (typeof opts?.offset === "number") params.set("offset", String(opts.offset));

  const qs = params.toString();
  const res = await apiFetch(`/api/notifications${qs ? `?${qs}` : ""}`);
  const payload = (await res.json()) as MyNotificationsResponse;
  if (Array.isArray(payload.items)) {
    payload.items = payload.items.map((item) => ({
      ...item,
      created_by_avatar_url:
        typeof item.created_by_avatar_url === "string" ? normalizeUploadUrl(item.created_by_avatar_url) : item.created_by_avatar_url,
    }));
  }
  return payload;
}

export async function markNotificationRead(notificationId: number) {
  const res = await apiFetch(`/api/notifications/${notificationId}/read`, {
    method: "PUT",
  });
  return res.json();
}

export type AdminNotificationListItem = {
  id: number;
  title: string;
  body: string;
  level: NotificationLevel;
  created_at: string;
  created_by: number | null;
  created_by_email: string | null;
  created_by_avatar_url?: string | null;
  recipient_count: number;
  read_count: number;
};

export async function listAdminNotifications(opts?: { limit?: number; offset?: number }) {
  const params = new URLSearchParams();
  if (typeof opts?.limit === "number") params.set("limit", String(opts.limit));
  if (typeof opts?.offset === "number") params.set("offset", String(opts.offset));
  const qs = params.toString();

  const res = await apiFetch(`/api/admin/notifications${qs ? `?${qs}` : ""}`);
  const payload = (await res.json()) as { items: AdminNotificationListItem[]; limit: number; offset: number };
  if (Array.isArray(payload.items)) {
    payload.items = payload.items.map((item) => ({
      ...item,
      created_by_avatar_url:
        typeof item.created_by_avatar_url === "string" ? normalizeUploadUrl(item.created_by_avatar_url) : item.created_by_avatar_url,
    }));
  }
  return payload;
}

export async function createAdminNotification(payload: {
  title: string;
  body: string;
  level?: NotificationLevel;
  all_users?: boolean;
  roles?: Array<"admin" | "editor" | "viewer">;
  user_ids?: number[];
}) {
  const res = await apiFetch("/api/admin/notifications", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json() as Promise<{ success: true; notification_id: number; recipient_count: number }>;
}

export const NOTIFICATIONS_CHANGED_EVENT = "app:notifications-changed";

export function emitNotificationsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
}

export function onNotificationsChanged(handler: () => void) {
  if (typeof window === "undefined") return () => {};
  const listener = () => handler();
  window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, listener);
  return () => {
    window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, listener);
  };
}
