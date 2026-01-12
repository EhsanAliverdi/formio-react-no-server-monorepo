import { useEffect, useMemo, useState } from "react";
import Button from "../../template/tailAdmin/components/ui/button/Button";
import Badge from "../../template/tailAdmin/components/ui/badge/Badge";
import { me, type AuthUser } from "../../shared/services/authService";
import { listUsers, type UserRow } from "../../shared/services/userService";
import {
  createAdminNotification,
  emitNotificationsChanged,
  getMyNotifications,
  markNotificationRead,
  type NotificationType,
  type NotificationRow,
} from "../../shared/services/notificationsService";

function formatWhen(value: string) {
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return value;
  return new Date(t).toLocaleString();
}

function badgeColor(type: NotificationType): "info" | "success" | "warning" | "error" {
  if (type === "success") return "success";
  if (type === "warning") return "warning";
  if (type === "error") return "error";
  return "info";
}

export default function AdminNotificationsPage() {
  const [viewer, setViewer] = useState<AuthUser | null>(null);
  const [loadingViewer, setLoadingViewer] = useState(true);

  const isAdmin = viewer?.role === "admin";

  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const [adminUsers, setAdminUsers] = useState<UserRow[]>([]);
  const [loadingAdminUsers, setLoadingAdminUsers] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState<NotificationType>("info");
  const [targetMode, setTargetMode] = useState<"all" | "selected">("selected");
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  const sortedUsers = useMemo(() => {
    return [...adminUsers].sort((a, b) => String(a.email).localeCompare(String(b.email)));
  }, [adminUsers]);

  const loadInbox = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyNotifications({ limit: 100, offset: 0 });
      setItems(res.items ?? []);
      setUnreadCount(res.unread_count ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const loadAdminUsers = async () => {
    if (!isAdmin) return;
    setLoadingAdminUsers(true);
    try {
      const users = await listUsers();
      setAdminUsers(users ?? []);
    } catch {
      setAdminUsers([]);
    } finally {
      setLoadingAdminUsers(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoadingViewer(true);

    me()
      .then((u) => {
        if (!cancelled) setViewer(u);
      })
      .catch(() => {
        if (!cancelled) setViewer(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingViewer(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loadingViewer) {
      void loadInbox();
    }
  }, [loadingViewer]);

  useEffect(() => {
    if (!loadingViewer && isAdmin) {
      void loadAdminUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingViewer, isAdmin]);

  if (loadingViewer) return <div className="text-gray-600">Loading…</div>;

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Notifications</h1>
          <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Unread: <span className="font-medium">{unreadCount}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadInbox}>
            Refresh
          </Button>
        </div>
      </div>

      {isAdmin && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">Create notification</h2>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Title</label>
              <input
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-hidden focus:ring-2 focus:ring-blue-500/40 dark:border-gray-800 dark:bg-transparent dark:text-white/90"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Password reset required"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Type</label>
              <select
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-hidden focus:ring-2 focus:ring-blue-500/40 dark:border-gray-800 dark:bg-transparent dark:text-white/90"
                value={type}
                onChange={(e) => setType(e.target.value as NotificationType)}
              >
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Message</label>
              <textarea
                className="mt-1 w-full min-h-30 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-hidden focus:ring-2 focus:ring-blue-500/40 dark:border-gray-800 dark:bg-transparent dark:text-white/90"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Describe the notification…"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Recipients</label>

              <div className="mt-2 flex flex-wrap items-center gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <input
                    type="radio"
                    name="recipientMode"
                    checked={targetMode === "selected"}
                    onChange={() => setTargetMode("selected")}
                  />
                  Selected users
                </label>

                <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <input
                    type="radio"
                    name="recipientMode"
                    checked={targetMode === "all"}
                    onChange={() => setTargetMode("all")}
                  />
                  All active users
                </label>
              </div>

              {targetMode === "selected" && (
                <div className="mt-3 rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                  {loadingAdminUsers ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">Loading users…</div>
                  ) : sortedUsers.length === 0 ? (
                    <div className="text-sm text-gray-600 dark:text-gray-400">No users found.</div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {sortedUsers.map((u) => {
                        const checked = selectedUserIds.includes(u.id);
                        return (
                          <label key={u.id} className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setSelectedUserIds((cur) => {
                                  if (cur.includes(u.id)) return cur.filter((x) => x !== u.id);
                                  return [...cur, u.id];
                                });
                              }}
                            />
                            <span className="truncate">{u.email}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="lg:col-span-2 flex items-center gap-3">
              <Button
                onClick={async () => {
                  setCreateError(null);
                  setCreateSuccess(null);
                  setCreating(true);
                  try {
                    const payload = {
                      title,
                      body,
                      type,
                      all_users: targetMode === "all",
                      user_ids: targetMode === "selected" ? selectedUserIds : undefined,
                    };

                    const res = await createAdminNotification(payload);
                    setCreateSuccess(`Sent to ${res.recipient_count} recipient(s).`);
                    setTitle("");
                    setBody("");
                    setType("info");
                    setSelectedUserIds([]);
                    await loadInbox();
                    emitNotificationsChanged();
                  } catch (e) {
                    setCreateError(e instanceof Error ? e.message : "Failed to create notification");
                  } finally {
                    setCreating(false);
                  }
                }}
                disabled={creating}
              >
                {creating ? "Sending…" : "Send"}
              </Button>

              {createError && <div className="text-sm text-error-600">{createError}</div>}
              {createSuccess && <div className="text-sm text-success-600">{createSuccess}</div>}
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
        <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">Your inbox</h2>

        {error && <div className="mt-3 text-sm text-error-600">{error}</div>}

        {loading ? (
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">Loading…</div>
        ) : items.length === 0 ? (
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">No notifications.</div>
        ) : (
          <div className="mt-4 space-y-3">
            {items.map((n) => {
              const unread = !n.read_at;
              return (
                <div
                  key={n.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-transparent"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge color={badgeColor(n.type)} variant={unread ? "solid" : "light"} size="sm">
                          {n.type}
                        </Badge>
                        <div className="font-medium text-gray-800 dark:text-white/90 truncate">{n.title}</div>
                      </div>

                      <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                        {formatWhen(n.created_at)}
                        {n.created_by_email ? ` • From: ${n.created_by_email}` : ""}
                      </div>
                    </div>

                    {unread && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await markNotificationRead(n.id);
                            await loadInbox();
                            emitNotificationsChanged();
                          } catch {
                            // ignore
                          }
                        }}
                      >
                        Mark read
                      </Button>
                    )}
                  </div>

                  <div className="mt-3 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{n.body}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
