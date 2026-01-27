import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { mexMaintenanceModules } from "./mexMaintenanceCatalog";
import { useMexMaintenanceServices } from "./mexMaintenanceServices";

interface MexMaintenanceOverviewProps {
  basePath: string;
  settingsPath: string;
}

export default function MexMaintenanceOverview({
  basePath,
  settingsPath,
}: MexMaintenanceOverviewProps) {
  const { isReady, services } = useMexMaintenanceServices();
  const [endpointResults, setEndpointResults] = useState([
    {
      key: "workOrders",
      label: "Work orders",
      description: "Total work orders returned.",
      value: null as number | null,
      status: "idle" as "idle" | "loading" | "ok" | "error",
    },
    {
      key: "employees",
      label: "Employees",
      description: "Total employees returned.",
      value: null as number | null,
      status: "idle" as "idle" | "loading" | "ok" | "error",
    },
    {
      key: "jobTypes",
      label: "Job types",
      description: "Job types available in MEX.",
      value: null as number | null,
      status: "idle" as "idle" | "loading" | "ok" | "error",
    },
    {
      key: "workOrderSpares",
      label: "Work order spares",
      description: "Spare parts tied to work orders.",
      value: null as number | null,
      status: "idle" as "idle" | "loading" | "ok" | "error",
    },
    {
      key: "workOrderTrades",
      label: "Work order trades",
      description: "Trades assigned to work orders.",
      value: null as number | null,
      status: "idle" as "idle" | "loading" | "ok" | "error",
    },
    {
      key: "departments",
      label: "Departments",
      description: "Departments returned from MEX.",
      value: null as number | null,
      status: "idle" as "idle" | "loading" | "ok" | "error",
    },
  ]);

  const totals = useMemo(() => {
    const totalModules = mexMaintenanceModules.length;
    const totalEndpoints = mexMaintenanceModules.reduce(
      (sum, module) => sum + module.endpoints.length,
      0
    );
    const okCount = endpointResults.filter((result) => result.status === "ok").length;
    return { totalModules, totalEndpoints, okCount };
  }, [endpointResults]);

  useEffect(() => {
    if (!isReady || !services) return;

    const loadSummary = async () => {
      setEndpointResults((prev) =>
        prev.map((item) => ({
          ...item,
          status: "loading",
        }))
      );

      const tasks = [
        { key: "workOrders", promise: services.workOrders.getAll() },
        { key: "employees", promise: services.employees.getAll() },
        { key: "jobTypes", promise: services.jobTypes.getAll() },
        { key: "workOrderSpares", promise: services.workOrderSpares.getAll() },
        { key: "workOrderTrades", promise: services.workOrderTrades.getAll() },
        { key: "departments", promise: services.departments.getAll() },
      ];

      const results = await Promise.all(
        tasks.map(async (task) => ({ key: task.key, result: await task.promise }))
      );

      setEndpointResults((prev) =>
        prev.map((item) => {
          const match = results.find((result) => result.key === item.key);
          if (!match) {
            return item;
          }
          if (!match.result.ok) {
            return { ...item, status: "error", value: null };
          }
          const value = Array.isArray(match.result.value) ? match.result.value.length : 0;
          return { ...item, status: "ok", value };
        })
      );
    };

    void loadSummary();
  }, [isReady, services]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              MEX Maintenance overview
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Review the latest endpoint results and keep track of SDK coverage.
            </p>
          </div>
          <Link
            to={settingsPath}
            className="inline-flex items-center justify-center rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-200"
          >
            Configure authentication
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            label: "SDK modules",
            value: totals.totalModules,
            helper: "Modules documented in SDK Help.",
          },
          {
            label: "SDK endpoints",
            value: totals.totalEndpoints,
            helper: "Total REST routes supported by the SDK.",
          },
          {
            label: "Connected endpoints",
            value: totals.okCount,
            helper: "Endpoints returning data from MEX.",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3"
          >
            <div className="text-xs uppercase tracking-wide text-gray-400">{card.label}</div>
            <div className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              {card.value}
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{card.helper}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                Endpoint results
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Live counts pulled from the endpoints supported by the SDK services.
              </p>
            </div>
            <Link
              to={`${basePath}/work-orders`}
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Open work orders
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {endpointResults.map((result) => (
              <div
                key={result.key}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-200"
              >
                <div>
                  <div className="font-semibold text-gray-800 dark:text-white/90">
                    {result.label}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {result.description}
                  </div>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {result.status === "loading"
                    ? "Loading…"
                    : result.status === "error"
                      ? "Unavailable"
                      : `${result.value ?? 0} records`}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
            SDK Help
          </h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Use the SDK Help submenu to review every endpoint and payload detail supported by the
            MEX Maintenance SDK.
          </p>
          <div className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-300">
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/30">
              Browse endpoint documentation by module, including REST paths and method metadata.
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/30">
              Each module view lists the available endpoints exposed by the SDK clients.
            </div>
          </div>
          <div className="mt-4">
            <Link
              to={`${basePath}/approval-path`}
              className="inline-flex items-center justify-center rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-200"
            >
              Go to SDK Help
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
