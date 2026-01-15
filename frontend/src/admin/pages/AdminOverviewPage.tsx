import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiClipboard, FiFileText, FiLayers, FiTrendingUp } from "react-icons/fi";

import { useForms } from "../../shared/components/formio";
import { getAdminStats, type AdminStats } from "../../shared/services/adminService";
import AdminChartsCard from "../components/AdminChartsCard";
import RecentActivityCard from "../components/RecentActivityCard";

function formatDateYmd(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

export default function AdminOverviewPage() {
  const navigate = useNavigate();
  const { forms, loading, error } = useForms();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setStatsLoading(true);
    setStatsError(null);

    getAdminStats()
      .then((payload) => {
        if (!alive) return;
        setStats(payload);
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setStatsError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (!alive) return;
        setStatsLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const statValue = (v: number | null | undefined, isLoading: boolean, hasError: boolean) => {
    if (isLoading) return "…";
    if (hasError) return "—";
    if (typeof v !== "number" || !Number.isFinite(v)) return "—";
    return String(v);
  };

  const submissionsLast7DaysLink = useMemo(() => {
    const today = new Date();
    const to = formatDateYmd(today);
    const from = formatDateYmd(addDays(today, -6));
    const sp = new URLSearchParams({ from, to });
    return `/admin/submissions?${sp.toString()}`;
  }, []);

  const clickableCardClassName = "w-full focus:outline-hidden focus:ring-2 focus:ring-blue-500/40";

  const cardSurfaceClassName = "hover:bg-gray-50 dark:hover:bg-white/[0.06]";

  return (
    <div className="w-full">
      <div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button type="button" className={clickableCardClassName} onClick={() => navigate("/admin/forms")}>
            <div
              className={`rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 ${cardSurfaceClassName}`}
            >
              <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
                <FiFileText className="text-gray-800 size-6 dark:text-white/90" />
              </div>

              <div className="flex items-end justify-between mt-5">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Total forms</span>
                  <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                    {loading ? "…" : error ? "—" : forms.length}
                  </h4>
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            className={clickableCardClassName}
            onClick={() => navigate("/admin/submissions")}
          >
            <div
              className={`rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 ${cardSurfaceClassName}`}
            >
              <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
                <FiClipboard className="text-gray-800 size-6 dark:text-white/90" />
              </div>

              <div className="flex items-end justify-between mt-5">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Total submissions</span>
                  <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                    {statValue(stats?.totalSubmissions, statsLoading, !!statsError)}
                  </h4>
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            className={clickableCardClassName}
            onClick={() => navigate("/admin/submissions")}
          >
            <div
              className={`rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 ${cardSurfaceClassName}`}
            >
              <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
                <FiLayers className="text-gray-800 size-6 dark:text-white/90" />
              </div>

              <div className="flex items-end justify-between mt-5">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Forms with submissions</span>
                  <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                    {statValue(stats?.submittedForms, statsLoading, !!statsError)}
                  </h4>
                </div>
              </div>
            </div>
          </button>

          <button
            type="button"
            className={clickableCardClassName}
            onClick={() => navigate(submissionsLast7DaysLink)}
          >
            <div
              className={`rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6 ${cardSurfaceClassName}`}
            >
              <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
                <FiTrendingUp className="text-gray-800 size-6 dark:text-white/90" />
              </div>

              <div className="flex items-end justify-between mt-5">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Submissions (last 7 days)</span>
                  <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">
                    {statValue(stats?.submissionsLast7Days, statsLoading, !!statsError)}
                  </h4>
                </div>
              </div>
            </div>
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>
        )}
        {statsError && (
          <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">{statsError}</div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <AdminChartsCard stats={stats} loading={statsLoading} error={statsError} />
          <RecentActivityCard />
        </div>
      </div>
    </div>
  );
}
