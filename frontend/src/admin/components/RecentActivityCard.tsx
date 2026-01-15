import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiBell, FiClipboard, FiEdit3, FiUser } from "react-icons/fi";

import ComponentCard from "../../template/tailAdmin/components/common/ComponentCard";
import { Modal } from "../../template/tailAdmin/components/ui/modal";
import { getAdminActivity, type AdminActivityItem } from "../../shared/services/adminActivityService";

function iconForType(type: AdminActivityItem["type"]) {
  if (type === "submission") return <FiClipboard className="size-5" />;
  if (type === "submission_updated") return <FiEdit3 className="size-5" />;
  if (type === "user_created") return <FiUser className="size-5" />;
  return <FiBell className="size-5" />;
}

function initialsFromEmail(email: string): string {
  const safe = (email || "").trim();
  if (!safe) return "?";

  const parts = safe.split(/[^a-zA-Z0-9]+/).filter(Boolean);
  const first = parts[0]?.[0] ?? safe[0];
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  const out = `${first}${last}`.toUpperCase();
  return out || "?";
}

function formatWhen(iso: string | null): string {
  if (!iso) return "unknown";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "unknown";

  const seconds = Math.round((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export default function RecentActivityCard() {
  const navigate = useNavigate();

  const [items, setItems] = useState<AdminActivityItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<AdminActivityItem | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    getAdminActivity(10)
      .then((payload) => {
        if (!alive) return;
        setItems(payload.items);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : String(e));
        setItems([]);
      })
      .finally(() => {
        if (!alive) return;
        setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const skeleton = useMemo(
    () => (
      <div className="mt-3 space-y-2">
        <div className="h-10 rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
        <div className="h-10 rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
        <div className="h-10 rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
      </div>
    ),
    []
  );

  return (
    <>
      <ComponentCard title="Recent activity" desc="Latest submissions, users, and notifications">
        {loading ? (
          skeleton
        ) : error ? (
          <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
        ) : items && items.length === 0 ? (
          <div className="text-sm text-gray-600 dark:text-gray-400">No recent activity yet.</div>
        ) : (
          <div className="mt-3 divide-y divide-gray-100 dark:divide-gray-800">
            {(items ?? []).map((it) => {
              const who = it.actor?.display_name || it.actor?.email || "System";
              const when = formatWhen(it.occurred_at);
              const initials = initialsFromEmail(it.actor?.email || "system");

              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => setSelected(it)}
                  className="w-full py-3 text-left focus:outline-hidden focus:ring-2 focus:ring-blue-500/40"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative mt-0.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
                        {it.actor?.avatar_url ? (
                          <img
                            src={it.actor.avatar_url}
                            alt={who}
                            className="h-9 w-9 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-semibold">{initials}</span>
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                        {iconForType(it.type)}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="truncate text-sm font-medium text-gray-900 dark:text-white/90">
                          {it.title}
                        </div>
                        <div className="shrink-0 text-xs text-gray-500 dark:text-gray-400">{when}</div>
                      </div>
                      <div className="mt-0.5 truncate text-sm text-gray-600 dark:text-gray-400">
                        {it.summary}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-500">
                        {who}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </ComponentCard>

      <Modal
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        className="w-[92vw] max-w-3xl overflow-y-auto p-6"
      >
        {selected && (
          <div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h5 className="mb-1 font-semibold text-gray-900 dark:text-white/90">{selected.title}</h5>
                <div className="text-sm text-gray-600 dark:text-gray-400">{selected.summary}</div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {selected.occurred_at ? new Date(selected.occurred_at).toLocaleString() : "unknown"}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Type</div>
                <div className="mt-1">{selected.type}</div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Actor</div>
                <div className="mt-1">
                  {selected.actor?.display_name || selected.actor?.email || "System"}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">Details</div>
              <pre className="mt-2 max-h-[320px] overflow-auto rounded bg-gray-50 p-3 text-xs text-gray-800 dark:bg-gray-950 dark:text-gray-200">
{JSON.stringify(
  {
    entity: selected.entity,
    actor: selected.actor,
    details: selected.details,
    link: selected.link,
  },
  null,
  2
)}
              </pre>
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              {selected.link && (
                <button
                  type="button"
                  onClick={() => {
                    const link = selected.link;
                    setSelected(null);
                    if (link) navigate(link);
                  }}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-white/[0.06]"
                >
                  Open related page
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
