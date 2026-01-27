import { useEffect, useMemo, useState } from "react";
import Button from "../../../../template/tailAdmin/components/ui/button/Button";
import Input from "../../../../template/tailAdmin/components/form/input/InputField";
import Label from "../../../../template/tailAdmin/components/form/Label";
import MexMaintenanceDrawer from "./MexMaintenanceDrawer";
import type { AssetDTO } from "../services/modules/asset";
import type { PriorityDTO } from "../services/modules/priority";
import type { RequestDTO } from "../services/modules/request";
import { useMexMaintenanceServices } from "./mexMaintenanceServices";

const emptyRequest: RequestDTO = {
  requestNumber: "",
  description: "",
  assetId: undefined,
  priorityId: undefined,
  status: "",
  requestedBy: "",
  requestDateTime: "",
};

const formatDate = (value?: string) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
};

export default function MexMaintenanceRequests() {
  const { isReady, config, services } = useMexMaintenanceServices();
  const [requests, setRequests] = useState<RequestDTO[]>([]);
  const [priorities, setPriorities] = useState<PriorityDTO[]>([]);
  const [assets, setAssets] = useState<AssetDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [formState, setFormState] = useState<RequestDTO>(emptyRequest);
  const [actionedByContactId, setActionedByContactId] = useState("");
  const [requestId, setRequestId] = useState("");

  useEffect(() => {
    if (!isReady || !services) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [requestResult, priorityResult, assetResult] = await Promise.all([
          services.requests.getAll(),
          services.priorities.getAll(),
          services.assets.getAll(),
        ]);

        if (!requestResult.ok) throw new Error(requestResult.error.message);
        if (!priorityResult.ok) throw new Error(priorityResult.error.message);
        if (!assetResult.ok) throw new Error(assetResult.error.message);

        setRequests(requestResult.value ?? []);
        setPriorities(priorityResult.value ?? []);
        setAssets(assetResult.value ?? []);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to load requests.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [isReady, services]);

  const assetLookup = useMemo(() => {
    return assets.reduce<Record<string, string>>((acc, asset) => {
      if (asset.assetId) {
        acc[String(asset.assetId)] = asset.assetNumber ?? asset.description ?? `Asset ${asset.assetId}`;
      }
      return acc;
    }, {});
  }, [assets]);

  const priorityLookup = useMemo(() => {
    return priorities.reduce<Record<string, string>>((acc, priority) => {
      if (priority.priorityId) {
        acc[String(priority.priorityId)] =
          priority.priorityDescription ?? `Priority ${priority.priorityId}`;
      }
      return acc;
    }, {});
  }, [priorities]);

  const openCreate = () => {
    setMode("create");
    setFormState(emptyRequest);
    setRequestId("");
    setDrawerOpen(true);
  };

  const openEdit = (request: RequestDTO) => {
    setMode("edit");
    setFormState(request);
    setRequestId(String(request.requestId ?? ""));
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    if (!services) return;
    if (!actionedByContactId.trim()) {
      setError("Actioned by contact ID is required.");
      return;
    }
    const actionedId = Number(actionedByContactId);
    if (!Number.isFinite(actionedId)) {
      setError("Actioned by contact ID must be numeric.");
      return;
    }

    setError(null);
    const payload: RequestDTO = {
      ...formState,
      assetId: formState.assetId ? Number(formState.assetId) : undefined,
      priorityId: formState.priorityId ? Number(formState.priorityId) : undefined,
    };

    if (mode === "create") {
      const result = await services.requests.create(actionedId, payload);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
    } else {
      if (!requestId.trim()) {
        setError("Request ID is required for updates.");
        return;
      }
      const result = await services.requests.update(Number(requestId), actionedId, payload);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
    }

    setDrawerOpen(false);
    const refreshed = await services.requests.getAll();
    if (refreshed.ok) {
      setRequests(refreshed.value ?? []);
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Maintenance requests
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Track incoming requests and convert them to work orders.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          Create Request
        </Button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800/40 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 text-left">Request Number</th>
              <th className="px-4 py-3 text-left">Description</th>
              <th className="px-4 py-3 text-left">Asset</th>
              <th className="px-4 py-3 text-left">Priority</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Created Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {requests.map((request) => (
              <tr
                key={request.requestId ?? request.requestNumber}
                className="cursor-pointer text-gray-700 transition hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-900/50"
                onClick={() => openEdit(request)}
              >
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white/90">
                  {request.requestNumber ?? "—"}
                </td>
                <td className="px-4 py-3">{request.description ?? "—"}</td>
                <td className="px-4 py-3">
                  {request.assetId ? assetLookup[String(request.assetId)] : "—"}
                </td>
                <td className="px-4 py-3">
                  {request.priorityId ? priorityLookup[String(request.priorityId)] : "—"}
                </td>
                <td className="px-4 py-3">{request.status ?? "Unspecified"}</td>
                <td className="px-4 py-3">{formatDate(request.requestDateTime)}</td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>
                  {loading ? "Loading requests..." : "No requests returned from the SDK."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <MexMaintenanceDrawer
        isOpen={drawerOpen}
        title={mode === "create" ? "Create request" : "Edit request"}
        onClose={() => setDrawerOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" size="sm" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSubmit}>
              {mode === "create" ? "Save request" : "Update request"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <div>
            <Label>Actioned by Contact ID</Label>
            <Input
              value={actionedByContactId}
              onChange={(event) => setActionedByContactId(event.target.value)}
              placeholder="Contact ID"
            />
          </div>
          {mode === "edit" && (
            <div>
              <Label>Request ID</Label>
              <Input
                value={requestId}
                onChange={(event) => setRequestId(event.target.value)}
                placeholder="Request ID"
              />
            </div>
          )}
          <div>
            <Label>Request Number</Label>
            <Input
              value={formState.requestNumber ?? ""}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, requestNumber: event.target.value }))
              }
            />
          </div>
          <div>
            <Label>Description</Label>
            <Input
              value={formState.description ?? ""}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, description: event.target.value }))
              }
            />
          </div>
          <div>
            <Label>Asset ID</Label>
            <Input
              value={formState.assetId ? String(formState.assetId) : ""}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  assetId: event.target.value ? Number(event.target.value) : undefined,
                }))
              }
            />
          </div>
          <div>
            <Label>Priority ID</Label>
            <Input
              value={formState.priorityId ? String(formState.priorityId) : ""}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  priorityId: event.target.value ? Number(event.target.value) : undefined,
                }))
              }
            />
          </div>
          <div>
            <Label>Status</Label>
            <Input
              value={formState.status ?? ""}
              onChange={(event) => setFormState((prev) => ({ ...prev, status: event.target.value }))}
            />
          </div>
          <div>
            <Label>Created Date</Label>
            <Input
              value={formState.requestDateTime ?? ""}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, requestDateTime: event.target.value }))
              }
              placeholder="YYYY-MM-DD"
            />
          </div>
        </div>
      </MexMaintenanceDrawer>
    </div>
  );
}
