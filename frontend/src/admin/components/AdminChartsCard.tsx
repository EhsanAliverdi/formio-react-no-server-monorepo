import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import ComponentCard from "../../template/tailAdmin/components/common/ComponentCard";
import type { AdminStats } from "../../shared/services/adminService";

type Props = {
  stats: AdminStats | null;
  loading: boolean;
  error: string | null;
};

type Metric = {
  key: string;
  label: string;
  value: number;
  onClick?: () => void;
};

function safeNumber(v: number | null | undefined): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export default function AdminChartsCard({ stats, loading, error }: Props) {
  const navigate = useNavigate();

  const metrics = useMemo<Metric[]>(() => {
    const s = stats;

    return [
      {
        key: "totalForms",
        label: "Total forms",
        value: safeNumber(s?.totalForms),
        onClick: () => navigate("/admin/forms"),
      },
      {
        key: "totalSubmissions",
        label: "Total submissions",
        value: safeNumber(s?.totalSubmissions),
        onClick: () => navigate("/admin/submissions"),
      },
      {
        key: "submittedForms",
        label: "Forms with submissions",
        value: safeNumber(s?.submittedForms),
        onClick: () => navigate("/admin/forms"),
      },
      {
        key: "submissionsToday",
        label: "Submissions today",
        value: safeNumber(s?.submissionsToday),
        onClick: () => navigate("/admin/submissions"),
      },
      {
        key: "submissionsLast7Days",
        label: "Submissions (last 7 days)",
        value: safeNumber(s?.submissionsLast7Days),
        onClick: () => navigate("/admin/submissions"),
      },
    ];
  }, [navigate, stats]);

  const max = useMemo(() => {
    if (!metrics.length) return 1;
    const m = Math.max(...metrics.map((x) => x.value));
    return m > 0 ? m : 1;
  }, [metrics]);

  return (
    <ComponentCard title="Charts" desc="Key metrics overview">
      {loading ? (
        <div className="mt-3 space-y-3">
          <div className="h-6 rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
          <div className="h-6 rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
          <div className="h-6 rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
          <div className="h-6 rounded-lg border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900" />
        </div>
      ) : error ? (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      ) : (
        <div className="mt-3 space-y-3">
          {metrics.map((m) => {
            const pct = Math.max(2, Math.round((m.value / max) * 100));
            const clickable = typeof m.onClick === "function";

            const Row = clickable ? "button" : "div";

            return (
              <Row
                key={m.key}
                type={clickable ? "button" : undefined}
                onClick={clickable ? m.onClick : undefined}
                className={
                  "w-full text-left rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900 " +
                  (clickable
                    ? "hover:bg-gray-50 dark:hover:bg-white/[0.06] focus:outline-hidden focus:ring-2 focus:ring-blue-500/40"
                    : "")
                }
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-gray-900 dark:text-white/90">
                    {m.label}
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white/90">
                    {m.value.toLocaleString()}
                  </div>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className="h-2 rounded-full bg-brand-500"
                    style={{ width: `${pct}%` }}
                    aria-hidden="true"
                  />
                </div>
              </Row>
            );
          })}

          <div className="pt-1 text-xs text-gray-500 dark:text-gray-400">
            Bars are normalized to the largest value.
          </div>
        </div>
      )}
    </ComponentCard>
  );
}
