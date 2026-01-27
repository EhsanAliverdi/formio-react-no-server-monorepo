import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { JobTypeDTO } from "../services/modules/job-type";
import type { PriorityDTO } from "../services/modules/priority";
import type { PurchaseOrderDTO } from "../services/modules/purchase-order";
import type { RequestDTO } from "../services/modules/request";
import type { RequisitionDTO } from "../services/modules/requisition";
import type { WorkOrderDTO } from "../services/modules/work-order";
import { useMexMaintenanceServices } from "./mexMaintenanceServices";

interface MexMaintenanceOverviewProps {
  basePath: string;
  settingsPath: string;
}

const isClosedStatus = (status?: string) =>
  Boolean(status && ["closed", "complete", "completed"].includes(status.toLowerCase()));

const parseDate = (value?: string) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (value?: string) => {
  if (!value) return "—";
  const parsed = parseDate(value);
  if (!parsed) return value;
  return parsed.toLocaleDateString();
};

const toCurrency = (amount?: number) =>
  typeof amount === "number"
    ? amount.toLocaleString(undefined, { style: "currency", currency: "USD" })
    : "—";

export default function MexMaintenanceOverview({
  basePath,
  settingsPath,
}: MexMaintenanceOverviewProps) {
  const { isReady, config, services } = useMexMaintenanceServices();
  const [workOrders, setWorkOrders] = useState<WorkOrderDTO[]>([]);
  const [requests, setRequests] = useState<RequestDTO[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderDTO[]>([]);
  const [requisitions, setRequisitions] = useState<RequisitionDTO[]>([]);
  const [priorities, setPriorities] = useState<PriorityDTO[]>([]);
  const [jobTypes, setJobTypes] = useState<JobTypeDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady || !services) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [
          workOrderResult,
          requestResult,
          purchaseOrderResult,
          requisitionResult,
          priorityResult,
          jobTypeResult,
        ] = await Promise.all([
          services.workOrders.getAll(),
          services.requests.getAll(),
          services.purchaseOrders.getAll(),
          services.requisitions.getAll(),
          services.priorities.getAll(),
          services.jobTypes.getAll(),
        ]);

        if (!workOrderResult.ok) throw new Error(workOrderResult.error.message);
        if (!requestResult.ok) throw new Error(requestResult.error.message);
        if (!purchaseOrderResult.ok) throw new Error(purchaseOrderResult.error.message);
        if (!requisitionResult.ok) throw new Error(requisitionResult.error.message);
        if (!priorityResult.ok) throw new Error(priorityResult.error.message);
        if (!jobTypeResult.ok) throw new Error(jobTypeResult.error.message);

        setWorkOrders(workOrderResult.value ?? []);
        setRequests(requestResult.value ?? []);
        setPurchaseOrders(purchaseOrderResult.value ?? []);
        setRequisitions(requisitionResult.value ?? []);
        setPriorities(priorityResult.value ?? []);
        setJobTypes(jobTypeResult.value ?? []);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to load overview data.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [isReady, services]);

  const kpis = useMemo(() => {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const openWorkOrders = workOrders.filter(
      (order) => !order.isClosed && !isClosedStatus(order.status)
    );

    const overdue = openWorkOrders.filter((order) => {
      const due = parseDate(order.scheduledEndDate ?? order.scheduledStartDate);
      return due ? due < startOfToday : false;
    });

    const dueToday = openWorkOrders.filter((order) => {
      const due = parseDate(order.scheduledStartDate ?? order.scheduledEndDate);
      return due ? due >= startOfToday && due < endOfToday : false;
    });

    const openRequests = requests.filter((request) => !isClosedStatus(request.status));

    const pendingPurchaseOrders = purchaseOrders.filter((order) => {
      if (typeof order.isApproved === "boolean") return !order.isApproved;
      return (order.approvalStatus ?? "").toLowerCase().includes("pending");
    });

    const openRequisitions = requisitions.filter((req) => {
      const status = (req.status ?? "").toLowerCase();
      return status.includes("pending") || status.includes("open") || status === "";
    });

    return {
      openWorkOrders: openWorkOrders.length,
      overdueWorkOrders: overdue.length,
      dueToday: dueToday.length,
      openRequests: openRequests.length,
      pendingPurchaseOrders: pendingPurchaseOrders.length,
      openRequisitions: openRequisitions.length,
    };
  }, [purchaseOrders, requisitions, requests, workOrders]);

  const statusBreakdown = useMemo(() => {
    const counts = workOrders.reduce<Record<string, number>>((acc, order) => {
      const key = order.status?.trim() || "Unspecified";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([label, value]) => ({ label, value }));
  }, [workOrders]);

  const priorityBreakdown = useMemo(() => {
    const priorityLookup = priorities.reduce<Record<string, string>>((acc, priority) => {
      if (priority.priorityId) {
        acc[String(priority.priorityId)] =
          priority.priorityDescription ?? `Priority ${priority.priorityId}`;
      }
      return acc;
    }, {});

    const counts = workOrders.reduce<Record<string, number>>((acc, order) => {
      const key = order.priorityId ? priorityLookup[String(order.priorityId)] : "Unassigned";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts).map(([label, value]) => ({ label, value }));
  }, [priorities, workOrders]);

  const jobTypeBreakdown = useMemo(() => {
    const jobTypeLookup = jobTypes.reduce<Record<string, string>>((acc, jobType) => {
      if (jobType.jobTypeId) {
        acc[String(jobType.jobTypeId)] = jobType.jobTypeName ?? "Job Type";
      }
      return acc;
    }, {});

    const counts = workOrders.reduce<Record<string, number>>((acc, order) => {
      const key = order.jobTypeId ? jobTypeLookup[String(order.jobTypeId)] : "Unassigned";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts).map(([label, value]) => ({ label, value }));
  }, [jobTypes, workOrders]);

  const requestsTrend = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }).map((_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleString(undefined, { month: "short" }),
      };
    });

    const counts = months.reduce<Record<string, number>>((acc, month) => {
      acc[month.key] = 0;
      return acc;
    }, {});

    requests.forEach((request) => {
      const created = parseDate(request.requestDateTime);
      if (!created) return;
      const key = `${created.getFullYear()}-${created.getMonth()}`;
      if (counts[key] !== undefined) {
        counts[key] += 1;
      }
    });

    return months.map((month) => ({ label: month.label, value: counts[month.key] }));
  }, [requests]);

  const recentWorkOrders = useMemo(() => {
    return [...workOrders]
      .sort((a, b) => {
        const dateA = parseDate(a.createdDateTime)?.getTime() ?? 0;
        const dateB = parseDate(b.createdDateTime)?.getTime() ?? 0;
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [workOrders]);

  const pendingPurchaseOrders = purchaseOrders.filter((order) => {
    if (typeof order.isApproved === "boolean") return !order.isApproved;
    return (order.approvalStatus ?? "").toLowerCase().includes("pending");
  });

  const pendingRequisitions = requisitions.filter((req) => {
    const status = (req.status ?? "").toLowerCase();
    return status.includes("pending") || status.includes("await") || status.includes("open");
  });

  const maxValue = (items: { value: number }[]) =>
    items.reduce((max, item) => Math.max(max, item.value), 0) || 1;

  const renderBarList = (items: { label: string; value: number }[]) => {
    const max = maxValue(items);
    return (
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="text-sm">
            <div className="flex items-center justify-between text-gray-700 dark:text-gray-200">
              <span>{item.label}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{item.value}</span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-2 rounded-full bg-brand-500"
                style={{ width: `${(item.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (!isReady) {
    return (
      <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-sm text-yellow-900 dark:border-yellow-900/60 dark:bg-yellow-900/20 dark:text-yellow-100">
        Configure the MEX base URL and authentication first. Current base URL: {config.baseUrl || "not set"}.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              Operational overview
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Real-time insight into work execution, requests, and approvals across MEX Maintenance.
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

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          { label: "Open work orders", value: kpis.openWorkOrders },
          { label: "Overdue work orders", value: kpis.overdueWorkOrders },
          { label: "Work orders due today", value: kpis.dueToday },
          { label: "Open requests", value: kpis.openRequests },
          { label: "Pending purchase orders", value: kpis.pendingPurchaseOrders },
          { label: "Open requisitions", value: kpis.openRequisitions },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3"
          >
            <div className="text-xs uppercase tracking-wide text-gray-400">{card.label}</div>
            <div className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              {loading ? "…" : card.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                Work orders by status
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Monitor throughput and status distribution across active work orders.
              </p>
            </div>
          </div>
          <div className="mt-4">{renderBarList(statusBreakdown)}</div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
              Work orders by priority
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Prioritize resources based on high-urgency work orders.
            </p>
          </div>
          <div className="mt-4">{renderBarList(priorityBreakdown)}</div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
              Work orders by job type
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Compare job type volume to balance planned maintenance.
            </p>
          </div>
          <div className="mt-4">{renderBarList(jobTypeBreakdown)}</div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
              Maintenance requests over time
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Track incoming maintenance demand by month.
            </p>
          </div>
          <div className="mt-4">{renderBarList(requestsTrend)}</div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                Recent work orders
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Latest work orders created in MEX Maintenance.
              </p>
            </div>
            <Link
              to={`${basePath}/maintenance/work-orders`}
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              View all
            </Link>
          </div>
          <div className="mt-4 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800/40 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left">Work Order Number</th>
                  <th className="px-4 py-3 text-left">Asset</th>
                  <th className="px-4 py-3 text-left">Priority</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {recentWorkOrders.map((order) => (
                  <tr key={order.workOrderId ?? order.workOrderNumber} className="text-gray-700 dark:text-gray-200">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white/90">
                      {order.workOrderNumber ?? "—"}
                    </td>
                    <td className="px-4 py-3">{order.assetId ? `Asset #${order.assetId}` : "—"}</td>
                    <td className="px-4 py-3">
                      {order.priorityId ? `Priority ${order.priorityId}` : "—"}
                    </td>
                    <td className="px-4 py-3">{order.status ?? "Unspecified"}</td>
                  </tr>
                ))}
                {recentWorkOrders.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-center text-gray-500" colSpan={4}>
                      No work orders returned from the SDK.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
          <div>
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
              Pending approvals
            </h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Purchase orders and requisitions awaiting action.
            </p>
          </div>
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900/30 dark:text-gray-200">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Purchase orders</span>
                <span className="text-xs uppercase tracking-wide text-gray-400">
                  {pendingPurchaseOrders.length} pending
                </span>
              </div>
              <div className="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                {pendingPurchaseOrders.slice(0, 3).map((order) => (
                  <div key={order.purchaseOrderId ?? order.purchaseOrderNumber}>
                    {order.purchaseOrderNumber ?? "PO"} · {toCurrency(order.totalAmount)}
                  </div>
                ))}
                {pendingPurchaseOrders.length === 0 && <div>No pending purchase orders.</div>}
              </div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900/30 dark:text-gray-200">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Requisitions</span>
                <span className="text-xs uppercase tracking-wide text-gray-400">
                  {pendingRequisitions.length} pending
                </span>
              </div>
              <div className="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                {pendingRequisitions.slice(0, 3).map((req) => (
                  <div key={req.requisitionId ?? req.requisitionNumber}>
                    {req.requisitionNumber ?? "Requisition"} · {formatDate(req.requiredDate)}
                  </div>
                ))}
                {pendingRequisitions.length === 0 && <div>No pending requisitions.</div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
          Quick actions
        </h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Start common maintenance tasks with one click.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            to={`${basePath}/maintenance/work-orders?create=true`}
            className="inline-flex items-center justify-center rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
          >
            Create Work Order
          </Link>
          <Link
            to={`${basePath}/maintenance/requests?create=true`}
            className="inline-flex items-center justify-center rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-200"
          >
            Create Request
          </Link>
          <Link
            to={`${basePath}/reports/backlog`}
            className="inline-flex items-center justify-center rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-200"
          >
            View Maintenance Backlog
          </Link>
        </div>
      </div>
    </div>
  );
}
