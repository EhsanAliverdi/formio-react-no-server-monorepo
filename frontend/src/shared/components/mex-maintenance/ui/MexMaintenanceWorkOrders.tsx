import { useEffect, useMemo, useState } from "react";
import Button from "../../../../template/tailAdmin/components/ui/button/Button";
import Input from "../../../../template/tailAdmin/components/form/input/InputField";
import Label from "../../../../template/tailAdmin/components/form/Label";
import MexMaintenanceDrawer from "./MexMaintenanceDrawer";
import type { JobTypeDTO } from "../services/modules/job-type";
import type { PriorityDTO } from "../services/modules/priority";
import type { WorkOrderDTO } from "../services/modules/work-order";
import type { WorkOrderSpareDTO } from "../services/modules/work-order-spare";
import type { WorkOrderTradeDTO } from "../services/modules/work-order-trade";
import { useMexMaintenanceServices } from "./mexMaintenanceServices";

const tabs = ["Overview", "Trades", "Spares", "Documents"] as const;

const formatDate = (value?: string) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
};

export default function MexMaintenanceWorkOrders() {
  const { isReady, config, services } = useMexMaintenanceServices();
  const [workOrders, setWorkOrders] = useState<WorkOrderDTO[]>([]);
  const [priorities, setPriorities] = useState<PriorityDTO[]>([]);
  const [jobTypes, setJobTypes] = useState<JobTypeDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrderDTO | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Overview");
  const [trades, setTrades] = useState<WorkOrderTradeDTO[]>([]);
  const [spares, setSpares] = useState<WorkOrderSpareDTO[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!isReady || !services) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [workOrderResult, priorityResult, jobTypeResult] = await Promise.all([
          services.workOrders.getAll(),
          services.priorities.getAll(),
          services.jobTypes.getAll(),
        ]);

        if (!workOrderResult.ok) throw new Error(workOrderResult.error.message);
        if (!priorityResult.ok) throw new Error(priorityResult.error.message);
        if (!jobTypeResult.ok) throw new Error(jobTypeResult.error.message);

        setWorkOrders(workOrderResult.value ?? []);
        setPriorities(priorityResult.value ?? []);
        setJobTypes(jobTypeResult.value ?? []);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to load work orders.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [isReady, services]);

  const priorityLookup = useMemo(() => {
    return priorities.reduce<Record<string, string>>((acc, priority) => {
      if (priority.priorityId) {
        acc[String(priority.priorityId)] =
          priority.priorityDescription ?? `Priority ${priority.priorityId}`;
      }
      return acc;
    }, {});
  }, [priorities]);

  const jobTypeLookup = useMemo(() => {
    return jobTypes.reduce<Record<string, string>>((acc, jobType) => {
      if (jobType.jobTypeId) {
        acc[String(jobType.jobTypeId)] = jobType.jobTypeName ?? "Job Type";
      }
      return acc;
    }, {});
  }, [jobTypes]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    return workOrders.filter((order) => {
      const matchesSearch =
        !query ||
        [order.workOrderNumber, order.description, order.status]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(query));

      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      const matchesPriority =
        priorityFilter === "all" || String(order.priorityId ?? "") === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [priorityFilter, search, statusFilter, workOrders]);

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = filteredOrders.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, priorityFilter]);

  const openDrawer = async (order: WorkOrderDTO) => {
    if (!services) return;
    setSelectedOrder(order);
    setActiveTab("Overview");
    setDetailLoading(true);
    try {
      const [tradeResult, spareResult] = await Promise.all([
        order.workOrderId ? services.workOrderTrades.getByWorkOrderId(order.workOrderId) : null,
        order.workOrderId ? services.workOrderSpares.getByWorkOrderId(order.workOrderId) : null,
      ]);

      if (tradeResult && tradeResult.ok) {
        setTrades(tradeResult.value ?? []);
      } else if (tradeResult && !tradeResult.ok) {
        setTrades([]);
      }

      if (spareResult && spareResult.ok) {
        setSpares(spareResult.value ?? []);
      } else if (spareResult && !spareResult.ok) {
        setSpares([]);
      }
    } finally {
      setDetailLoading(false);
    }
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
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
        <div className="grid gap-4 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Label>Search</Label>
            <Input
              placeholder="Search by work order number, description, or status"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div>
            <Label>Status</Label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              <option value="all">All statuses</option>
              {[...new Set(workOrders.map((order) => order.status).filter(Boolean))].map(
                (status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                )
              )}
            </select>
          </div>
          <div>
            <Label>Priority</Label>
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              <option value="all">All priorities</option>
                  {priorities.map((priority) => (
                    <option key={priority.priorityId} value={String(priority.priorityId)}>
                      {priority.priorityDescription ?? `Priority ${priority.priorityId}`}
                    </option>
                  ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
              Work orders
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {filteredOrders.length} work orders matched
            </p>
          </div>
          <Button size="sm" variant="outline">
            Export
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800/40 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">Work Order Number</th>
                <th className="px-4 py-3 text-left">Description</th>
                <th className="px-4 py-3 text-left">Asset</th>
                <th className="px-4 py-3 text-left">Priority</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Scheduled Dates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {paginatedOrders.map((order) => (
                <tr
                  key={order.workOrderId ?? order.workOrderNumber}
                  className="cursor-pointer text-gray-700 transition hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-900/50"
                  onClick={() => openDrawer(order)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white/90">
                    {order.workOrderNumber ?? "—"}
                  </td>
                  <td className="px-4 py-3">{order.description ?? "—"}</td>
                  <td className="px-4 py-3">{order.assetId ? `Asset #${order.assetId}` : "—"}</td>
                  <td className="px-4 py-3">
                    {order.priorityId ? priorityLookup[String(order.priorityId)] : "—"}
                  </td>
                  <td className="px-4 py-3">{order.status ?? "Unspecified"}</td>
                  <td className="px-4 py-3">
                    {formatDate(order.scheduledStartDate)} → {formatDate(order.scheduledEndDate)}
                  </td>
                </tr>
              ))}
              {paginatedOrders.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>
                    {loading ? "Loading work orders..." : "No work orders matched the filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 px-5 py-4 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <MexMaintenanceDrawer
        isOpen={Boolean(selectedOrder)}
        title={selectedOrder?.workOrderNumber ?? "Work order"}
        onClose={() => setSelectedOrder(null)}
        footer={
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>Job type: {selectedOrder?.jobTypeId ? jobTypeLookup[String(selectedOrder.jobTypeId)] : "—"}</span>
            <span>Status: {selectedOrder?.status ?? "Unspecified"}</span>
          </div>
        }
      >
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                activeTab === tab
                  ? "bg-brand-600 text-white"
                  : "border border-gray-200 text-gray-500 hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Overview" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-900/30">
              <div className="text-xs uppercase text-gray-400">Description</div>
              <div className="mt-2 text-gray-700 dark:text-gray-200">
                {selectedOrder?.description ?? "No description provided."}
              </div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-900/30">
              <div className="text-xs uppercase text-gray-400">Schedule</div>
              <div className="mt-2 text-gray-700 dark:text-gray-200">
                {formatDate(selectedOrder?.scheduledStartDate)} → {formatDate(selectedOrder?.scheduledEndDate)}
              </div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-900/30">
              <div className="text-xs uppercase text-gray-400">Requested by</div>
              <div className="mt-2 text-gray-700 dark:text-gray-200">
                {selectedOrder?.requestedBy ?? "—"}
              </div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-900/30">
              <div className="text-xs uppercase text-gray-400">Priority</div>
              <div className="mt-2 text-gray-700 dark:text-gray-200">
                {selectedOrder?.priorityId ? priorityLookup[String(selectedOrder.priorityId)] : "—"}
              </div>
            </div>
          </div>
        )}

        {activeTab === "Trades" && (
          <div className="space-y-3">
            {detailLoading && <div className="text-sm text-gray-500">Loading trades…</div>}
            {!detailLoading && trades.length === 0 && (
              <div className="text-sm text-gray-500">No trades assigned.</div>
            )}
            {trades.map((trade) => (
              <div
                key={trade.workOrderTradeId ?? trade.tradeCodeId}
                className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-900/30"
              >
                <div className="font-semibold text-gray-800 dark:text-white/90">
                  Trade #{trade.tradeCodeId ?? "—"}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Hours: {trade.hoursWorked ?? "—"} · Cost: {trade.labourCost ?? "—"}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "Spares" && (
          <div className="space-y-3">
            {detailLoading && <div className="text-sm text-gray-500">Loading spares…</div>}
            {!detailLoading && spares.length === 0 && (
              <div className="text-sm text-gray-500">No spares recorded.</div>
            )}
            {spares.map((spare) => (
              <div
                key={spare.workOrderSpareId ?? spare.catalogueId}
                className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-900/30"
              >
                <div className="font-semibold text-gray-800 dark:text-white/90">
                  Catalogue #{spare.catalogueId ?? "—"}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Quantity: {spare.quantity ?? "—"} · Cost: {spare.totalCost ?? "—"}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "Documents" && (
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900/30 dark:text-gray-300">
            Document metadata is managed via the MEX document service. Use the SDK Help section for
            document operations linked to work orders.
          </div>
        )}
      </MexMaintenanceDrawer>
    </div>
  );
}
