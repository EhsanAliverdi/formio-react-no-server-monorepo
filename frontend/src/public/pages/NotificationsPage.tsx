import { useEffect, useState } from "react";
import { getAuthToken } from "../../shared/services/apiClient";
import { me, type AuthUser } from "../../shared/services/authService";
import {
  emitNotificationsChanged,
  getMyNotifications,
  markNotificationRead,
  type NotificationRow,
  type NotificationLevel,
} from "../../shared/services/notificationsService";
import Button from "../../template/tailAdmin/components/ui/button/Button";
import Badge from "../../template/tailAdmin/components/ui/badge/Badge";

function formatWhen(value: string) {
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return value;
  return new Date(t).toLocaleString();
}

function badgeColor(level: NotificationLevel): "info" | "success" | "warning" | "error" {
  if (level === "critical") return "error";
  if (level === "high") return "warning";
  if (level === "low") return "info";
  return "success";
}

export default function NotificationsPage() {
  const [viewer, setViewer] = useState<AuthUser | null>(null);
  const [loadingViewer, setLoadingViewer] = useState(true);

  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setViewer(null);
      setLoadingViewer(false);
      return;
    }

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
    if (!loadingViewer && viewer) {
      void loadInbox();
    }
  }, [loadingViewer, viewer]);

  if (loadingViewer) {
    return <div className="text-gray-600">Loading…</div>;
  }

  if (!viewer) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Notifications</h1>
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Please sign in to view your notifications.
        </div>
      </div>
    );
  }

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
                        <Badge color={badgeColor(n.level)} variant={unread ? "solid" : "light"} size="sm">
                          {n.level}
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
