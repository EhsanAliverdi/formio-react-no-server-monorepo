import { useEffect, useMemo, useState } from "react";
import Button from "../../../../template/tailAdmin/components/ui/button/Button";
import Input from "../../../../template/tailAdmin/components/form/input/InputField";
import Label from "../../../../template/tailAdmin/components/form/Label";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../../../template/tailAdmin/components/ui/table";
import type { WorkOrderDTO } from "../services/modules/work-order";
import { useMexMaintenanceServices } from "./mexMaintenanceServices";

const emptyWorkOrder: WorkOrderDTO = {
  workOrderNumber: "",
  description: "",
  status: "",
  requestedBy: "",
  scheduledStartDate: "",
  scheduledEndDate: "",
  priorityId: undefined,
  jobTypeId: undefined,
  assetId: undefined,
  departmentId: undefined,
};

export default function MexMaintenanceWorkOrders() {
  const { isReady, config, services } = useMexMaintenanceServices();
  const [workOrders, setWorkOrders] = useState<WorkOrderDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lookupId, setLookupId] = useState("");
  const [lookupNumber, setLookupNumber] = useState("");
  const [lookupResult, setLookupResult] = useState<WorkOrderDTO | null>(null);
  const [actionedByContactId, setActionedByContactId] = useState("");
  const [mode, setMode] = useState<"create" | "update">("create");
  const [workOrderId, setWorkOrderId] = useState("");
  const [formState, setFormState] = useState<WorkOrderDTO>(emptyWorkOrder);

  const summary = useMemo(() => {
    const total = workOrders.length;
    const closed = workOrders.filter((item) => item.isClosed).length;
    const open = total - closed;
    return { total, open, closed };
  }, [workOrders]);

  const loadAll = async () => {
    if (!services) return;
    setLoading(true);
    setError(null);
    try {
      const result = await services.workOrders.getAll();
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setWorkOrders(result.value ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady) return;
    void loadAll();
    setLookupResult(null);
  }, [isReady]);

  const handleLookupById = async () => {
    if (!services) return;
    if (!lookupId.trim()) {
      setError("Enter a work order ID to search.");
      return;
    }
    setError(null);
    const id = Number(lookupId);
    const result = await services.workOrders.getById(id);
    if (!result.ok) {
      setError(result.error.message);
      setLookupResult(null);
      return;
    }
    setLookupResult(result.value ?? null);
  };

  const handleLookupByNumber = async () => {
    if (!services) return;
    if (!lookupNumber.trim()) {
      setError("Enter a work order number to search.");
      return;
    }
    setError(null);
    const result = await services.workOrders.getByWorkOrderNumber(lookupNumber.trim());
    if (!result.ok) {
      setError(result.error.message);
      setLookupResult(null);
      return;
    }
    setLookupResult(result.value ?? null);
  };

  const handleSubmit = async () => {
    if (!services) return;
    if (!actionedByContactId.trim()) {
      setError("Actioned by contact ID is required.");
      return;
    }
    const actionedId = Number(actionedByContactId);
    if (!Number.isFinite(actionedId)) {
      setError("Actioned by contact ID must be a number.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload: WorkOrderDTO = {
      ...formState,
      priorityId: formState.priorityId ? Number(formState.priorityId) : undefined,
      jobTypeId: formState.jobTypeId ? Number(formState.jobTypeId) : undefined,
      assetId: formState.assetId ? Number(formState.assetId) : undefined,
      departmentId: formState.departmentId ? Number(formState.departmentId) : undefined,
    };

    try {
      if (mode === "create") {
        const result = await services.workOrders.create(actionedId, payload);
        if (!result.ok) {
          setError(result.error.message);
          return;
        }
      } else {
        if (!workOrderId.trim()) {
          setError("Work order ID is required for updates.");
          return;
        }
        const result = await services.workOrders.update(
          Number(workOrderId),
          actionedId,
          payload
        );
        if (!result.ok) {
          setError(result.error.message);
          return;
        }
      }

      setFormState(emptyWorkOrder);
      setWorkOrderId("");
      await loadAll();
    } finally {
      setSaving(false);
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
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Total work orders", value: summary.total },
          { label: "Open", value: summary.open },
          { label: "Closed", value: summary.closed },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3"
          >
            <div className="text-xs uppercase tracking-wide text-gray-400">
              {card.label}
            </div>
            <div className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              {loading ? "…" : card.value}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
              Work order list
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              View all work orders pulled from the MEX Maintenance API.
            </p>
          </div>
          <Button variant="outline" onClick={loadAll} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <Table className="text-sm">
            <TableHeader>
              <TableRow className="border-b border-gray-200 text-left text-xs uppercase text-gray-400">
                <TableCell isHeader className="pb-2">
                  Work order #
                </TableCell>
                <TableCell isHeader className="pb-2">
                  Description
                </TableCell>
                <TableCell isHeader className="pb-2">
                  Status
                </TableCell>
                <TableCell isHeader className="pb-2">
                  Requested by
                </TableCell>
                <TableCell isHeader className="pb-2">
                  Scheduled
                </TableCell>
                <TableCell isHeader className="pb-2">
                  Closed
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workOrders.length === 0 ? (
                <TableRow>
                  <td className="py-4 text-gray-500" colSpan={6}>
                    {loading ? "Loading work orders…" : "No work orders returned yet."}
                  </td>
                </TableRow>
              ) : (
                workOrders.map((item) => (
                  <TableRow key={item.workOrderId ?? item.workOrderNumber ?? Math.random()}>
                    <TableCell className="py-3 font-medium text-gray-800 dark:text-white/90">
                      {item.workOrderNumber ?? item.workOrderId ?? "—"}
                    </TableCell>
                    <TableCell className="py-3 text-gray-600 dark:text-gray-300">
                      {item.description ?? "—"}
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="rounded-full bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
                        {item.status ?? "Unknown"}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 text-gray-600 dark:text-gray-300">
                      {item.requestedBy ?? "—"}
                    </TableCell>
                    <TableCell className="py-3 text-gray-600 dark:text-gray-300">
                      {item.scheduledStartDate ?? "—"}
                    </TableCell>
                    <TableCell className="py-3 text-gray-600 dark:text-gray-300">
                      {item.isClosed ? "Yes" : "No"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
            Lookup work orders
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Use the SDK endpoints to pull a single work order by ID or number.
          </p>

          <div className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mexWorkOrderId">Work order ID</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="mexWorkOrderId"
                  type="number"
                  placeholder="12345"
                  value={lookupId}
                  onChange={(e) => setLookupId(e.target.value)}
                />
                <Button variant="outline" onClick={handleLookupById}>
                  Fetch by ID
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mexWorkOrderNumber">Work order number</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="mexWorkOrderNumber"
                  type="text"
                  placeholder="WO-10001"
                  value={lookupNumber}
                  onChange={(e) => setLookupNumber(e.target.value)}
                />
                <Button variant="outline" onClick={handleLookupByNumber}>
                  Fetch by number
                </Button>
              </div>
            </div>
          </div>

          {lookupResult && (
            <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-200">
              <div className="font-semibold text-gray-800 dark:text-white/90">
                {lookupResult.workOrderNumber ?? `Work order ${lookupResult.workOrderId}`}
              </div>
              <div className="mt-2 grid gap-2 text-xs text-gray-500 dark:text-gray-400">
                <div>Description: {lookupResult.description ?? "—"}</div>
                <div>Status: {lookupResult.status ?? "—"}</div>
                <div>Requested by: {lookupResult.requestedBy ?? "—"}</div>
                <div>Scheduled start: {lookupResult.scheduledStartDate ?? "—"}</div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
            {mode === "create" ? "Create work order" : "Update work order"}
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {mode === "create"
              ? "Provide the work order details and the employee/contact ID taking action."
              : "Update an existing work order using its ID and actioned-by employee/contact ID."}
          </p>

          <div className="mt-4 grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="mexWorkOrderMode">Mode</Label>
              <div className="flex flex-wrap gap-2">
                {(["create", "update"] as const).map((value) => (
                  <Button
                    key={value}
                    variant={mode === value ? "primary" : "outline"}
                    onClick={() => setMode(value)}
                  >
                    {value === "create" ? "Create" : "Update"}
                  </Button>
                ))}
              </div>
            </div>

            {mode === "update" && (
              <div className="space-y-2">
                <Label htmlFor="mexWorkOrderUpdateId">Work order ID</Label>
                <Input
                  id="mexWorkOrderUpdateId"
                  type="number"
                  placeholder="12345"
                  value={workOrderId}
                  onChange={(e) => setWorkOrderId(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="mexWorkOrderActioned">Actioned by contact ID</Label>
              <Input
                id="mexWorkOrderActioned"
                type="number"
                placeholder="Employee/Contact ID"
                value={actionedByContactId}
                onChange={(e) => setActionedByContactId(e.target.value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mexWorkOrderNumberInput">Work order number</Label>
                <Input
                  id="mexWorkOrderNumberInput"
                  type="text"
                  placeholder="WO-10001"
                  value={formState.workOrderNumber ?? ""}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      workOrderNumber: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mexWorkOrderStatus">Status</Label>
                <Input
                  id="mexWorkOrderStatus"
                  type="text"
                  placeholder="Open"
                  value={formState.status ?? ""}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      status: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mexWorkOrderDescription">Description</Label>
              <Input
                id="mexWorkOrderDescription"
                type="text"
                placeholder="Describe the work"
                value={formState.description ?? ""}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mexWorkOrderRequested">Requested by</Label>
                <Input
                  id="mexWorkOrderRequested"
                  type="text"
                  placeholder="Requester"
                  value={formState.requestedBy ?? ""}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      requestedBy: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mexWorkOrderPriority">Priority ID</Label>
                <Input
                  id="mexWorkOrderPriority"
                  type="number"
                  placeholder="1"
                  value={formState.priorityId ?? ""}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      priorityId: e.target.value ? Number(e.target.value) : undefined,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mexWorkOrderStart">Scheduled start</Label>
                <Input
                  id="mexWorkOrderStart"
                  type="date"
                  value={formState.scheduledStartDate ?? ""}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      scheduledStartDate: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mexWorkOrderEnd">Scheduled end</Label>
                <Input
                  id="mexWorkOrderEnd"
                  type="date"
                  value={formState.scheduledEndDate ?? ""}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      scheduledEndDate: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving…" : mode === "create" ? "Create work order" : "Update work order"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
