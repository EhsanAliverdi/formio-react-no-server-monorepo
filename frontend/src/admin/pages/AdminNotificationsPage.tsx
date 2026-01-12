import { useEffect, useMemo, useRef, useState } from "react";
import Button from "../../template/tailAdmin/components/ui/button/Button";
import Badge from "../../template/tailAdmin/components/ui/badge/Badge";
import { me, type AuthUser } from "../../shared/services/authService";
import { listUsers, type UserRow } from "../../shared/services/userService";
import {
  createAdminNotification,
  listAdminNotifications,
  emitNotificationsChanged,
  type AdminNotificationListItem,
  type NotificationLevel,
} from "../../shared/services/notificationsService";

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

function normalizeLevel(value: unknown): NotificationLevel {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (v === "low" || v === "normal" || v === "high" || v === "critical") return v;
  return "normal";
}

export default function AdminNotificationsPage() {
  const [viewer, setViewer] = useState<AuthUser | null>(null);
  const [loadingViewer, setLoadingViewer] = useState(true);

  const isAdmin = viewer?.role === "admin";

  const [sentItems, setSentItems] = useState<AdminNotificationListItem[]>([]);
  const [loadingSent, setLoadingSent] = useState(true);
  const [sentError, setSentError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);

  const [adminUsers, setAdminUsers] = useState<UserRow[]>([]);
  const [loadingAdminUsers, setLoadingAdminUsers] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [level, setLevel] = useState<NotificationLevel>("normal");
  const [targetMode, setTargetMode] = useState<"all" | "custom">("custom");
  const [selectedRoles, setSelectedRoles] = useState<Array<UserRow["role"]>>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  const [userSearch, setUserSearch] = useState("");
  const userSearchDebounceRef = useRef<number | null>(null);

  const sortedUsers = useMemo(() => {
    return [...adminUsers].sort((a, b) => String(a.email).localeCompare(String(b.email)));
  }, [adminUsers]);

  const selectedUserCount = useMemo(() => selectedUserIds.length, [selectedUserIds]);
  const selectedRoleCount = useMemo(() => selectedRoles.length, [selectedRoles]);

  const loadSent = async () => {
    setLoadingSent(true);
    setSentError(null);
    try {
      const res = await listAdminNotifications({ limit: 100, offset: 0 });
      const mapped = (res.items ?? []).map((n) => ({
        ...n,
        level: normalizeLevel((n as unknown as { level?: unknown }).level ?? (n as unknown as { type?: unknown }).type),
      }));
      setSentItems(mapped);
    } catch (e) {
      setSentError(e instanceof Error ? e.message : "Failed to load sent notifications");
      setSentItems([]);
    } finally {
      setLoadingSent(false);
    }
  };

  const loadAdminUsers = async (opts?: { search?: string }) => {
    if (!isAdmin) return;
    setLoadingAdminUsers(true);
    try {
      const users = await listUsers({
        search: opts?.search,
        roles: selectedRoles.length > 0 ? selectedRoles : undefined,
        limit: 50,
        activeOnly: true,
      });
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
    if (!loadingViewer && isAdmin) {
      void loadSent();
      void loadAdminUsers({ search: userSearch });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingViewer, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    if (userSearchDebounceRef.current) window.clearTimeout(userSearchDebounceRef.current);
    userSearchDebounceRef.current = window.setTimeout(() => {
      void loadAdminUsers({ search: userSearch });
    }, 250);

    return () => {
      if (userSearchDebounceRef.current) window.clearTimeout(userSearchDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userSearch, selectedRoles.join(","), isAdmin]);

  if (loadingViewer) return <div className="text-gray-600">Loading…</div>;

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Admin notifications</h1>
          <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">Broadcast notifications to users.</div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin ? (
            <Button variant="outline" onClick={loadSent}>
              Refresh sent
            </Button>
          ) : null}
        </div>
      </div>

      {isAdmin && (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">Send notification</h2>

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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Importance</label>
              <select
                className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-hidden focus:ring-2 focus:ring-blue-500/40 dark:border-gray-800 dark:bg-transparent dark:text-white/90"
                value={level}
                onChange={(e) => setLevel(e.target.value as NotificationLevel)}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
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
                    checked={targetMode === "custom"}
                    onChange={() => setTargetMode("custom")}
                  />
                  Roles and/or selected users
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

              {targetMode === "custom" && (
                <div className="mt-3 rounded-lg border border-gray-200 p-3 dark:border-gray-800">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-200">By role</div>
                      <div className="mt-2 flex flex-wrap items-center gap-4">
                        {(["admin", "editor", "viewer"] as const).map((r) => (
                          <label key={r} className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                            <input
                              type="checkbox"
                              checked={selectedRoles.includes(r)}
                              onChange={() => {
                                setSelectedRoles((cur) => {
                                  if (cur.includes(r)) return cur.filter((x) => x !== r);
                                  return [...cur, r];
                                });
                              }}
                            />
                            <span className="capitalize">{r}</span>
                          </label>
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">Selected roles: {selectedRoleCount}</div>
                    </div>

                    <div>
                      <div className="text-sm font-medium text-gray-700 dark:text-gray-200">By user</div>

                      <input
                        className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-hidden focus:ring-2 focus:ring-blue-500/40 dark:border-gray-800 dark:bg-transparent dark:text-white/90"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Search users (email/name)…"
                      />

                      <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                        Selected users: {selectedUserCount}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    {loadingAdminUsers ? (
                      <div className="text-sm text-gray-600 dark:text-gray-400">Loading users…</div>
                    ) : sortedUsers.length === 0 ? (
                      <div className="text-sm text-gray-600 dark:text-gray-400">No users found.</div>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {sortedUsers.map((u) => {
                          const checked = selectedUserIds.includes(u.id);
                          const inactive = u.is_active === 0;
                          return (
                            <label
                              key={u.id}
                              className={`inline-flex items-center gap-2 text-sm ${
                                inactive ? "text-gray-400" : "text-gray-700 dark:text-gray-200"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={inactive}
                                onChange={() => {
                                  setSelectedUserIds((cur) => {
                                    if (cur.includes(u.id)) return cur.filter((x) => x !== u.id);
                                    return [...cur, u.id];
                                  });
                                }}
                              />
                              <span className="truncate">{u.email}</span>
                              <span className="text-xs text-gray-500">({u.role})</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
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
                      level,
                      all_users: targetMode === "all",
                      roles: targetMode === "custom" && selectedRoles.length > 0 ? selectedRoles : undefined,
                      user_ids: targetMode === "custom" && selectedUserIds.length > 0 ? selectedUserIds : undefined,
                    };

                    const res = await createAdminNotification(payload);
                    setCreateSuccess(`Sent to ${res.recipient_count} recipient(s).`);
                    setTitle("");
                    setBody("");
                    setLevel("normal");
                    setSelectedRoles([]);
                    setSelectedUserIds([]);
                    await loadSent();
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
        <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">Sent notifications</h2>

        {sentError && <div className="mt-3 text-sm text-error-600">{sentError}</div>}

        {loadingSent ? (
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">Loading…</div>
        ) : sentItems.length === 0 ? (
          <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">No sent notifications.</div>
        ) : (
          <div className="mt-4 space-y-3">
            {sentItems.map((n) => {
              return (
                <div
                  key={n.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-transparent"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge color={badgeColor(n.level)} variant="light" size="sm">
                          {n.level}
                        </Badge>
                        <div className="font-medium text-gray-800 dark:text-white/90 truncate">{n.title}</div>
                      </div>

                      <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                        {formatWhen(n.created_at)}
                        {n.created_by_email ? ` • From: ${n.created_by_email}` : ""}
                        {` • Recipients: ${n.recipient_count} • Read: ${n.read_count}`}
                      </div>
                    </div>
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
