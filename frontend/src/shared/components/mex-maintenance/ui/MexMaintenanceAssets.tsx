import { useEffect, useMemo, useState } from "react";
import Button from "../../../../template/tailAdmin/components/ui/button/Button";
import Input from "../../../../template/tailAdmin/components/form/input/InputField";
import Label from "../../../../template/tailAdmin/components/form/Label";
import MexMaintenanceDrawer from "./MexMaintenanceDrawer";
import type { AssetDTO } from "../services/modules/asset";
import type { WorkOrderDTO } from "../services/modules/work-order";
import { useMexMaintenanceServices } from "./mexMaintenanceServices";

const tabs = ["Overview", "Readings", "Work Orders", "Documents"] as const;

export default function MexMaintenanceAssets() {
  const { isReady, config, services } = useMexMaintenanceServices();
  const [assets, setAssets] = useState<AssetDTO[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedAsset, setSelectedAsset] = useState<AssetDTO | null>(null);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Overview");

  useEffect(() => {
    if (!isReady || !services) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [assetResult, workOrderResult] = await Promise.all([
          services.assets.getAll(),
          services.workOrders.getAll(),
        ]);
        if (!assetResult.ok) throw new Error(assetResult.error.message);
        if (!workOrderResult.ok) throw new Error(workOrderResult.error.message);
        setAssets(assetResult.value ?? []);
        setWorkOrders(workOrderResult.value ?? []);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to load assets.";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [isReady, services]);

  const filteredAssets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return assets.filter((asset) => {
      if (!query) return true;
      return [asset.assetNumber, asset.description, asset.location, asset.status]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query));
    });
  }, [assets, search]);

  const relatedWorkOrders = useMemo(() => {
    if (!selectedAsset?.assetId) return [];
    return workOrders.filter((order) => order.assetId === selectedAsset.assetId);
  }, [selectedAsset, workOrders]);

  if (!isReady) {
    return (
      <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-sm text-yellow-900 dark:border-yellow-900/60 dark:bg-yellow-900/20 dark:text-yellow-100">
        Configure the MEX base URL and authentication first. Current base URL: {config.baseUrl || "not set"}.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Assets</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Maintain asset status, location, and service history.
          </p>
        </div>
        <div className="min-w-[220px]">
          <Label>Search assets</Label>
          <Input
            placeholder="Search by asset number, description, or location"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
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
              <th className="px-4 py-3 text-left">Asset Number</th>
              <th className="px-4 py-3 text-left">Asset Name</th>
              <th className="px-4 py-3 text-left">Location</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filteredAssets.map((asset) => (
              <tr
                key={asset.assetId ?? asset.assetNumber}
                className="cursor-pointer text-gray-700 transition hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-900/50"
                onClick={() => {
                  setSelectedAsset(asset);
                  setActiveTab("Overview");
                }}
              >
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white/90">
                  {asset.assetNumber ?? "—"}
                </td>
                <td className="px-4 py-3">{asset.description ?? "—"}</td>
                <td className="px-4 py-3">{asset.location ?? "—"}</td>
                <td className="px-4 py-3">{asset.status ?? "Unspecified"}</td>
              </tr>
            ))}
            {filteredAssets.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={4}>
                  {loading ? "Loading assets..." : "No assets returned from the SDK."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <MexMaintenanceDrawer
        isOpen={Boolean(selectedAsset)}
        title={selectedAsset?.assetNumber ?? "Asset details"}
        onClose={() => setSelectedAsset(null)}
        footer={
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Status: {selectedAsset?.status ?? "Unspecified"}
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
              <div className="text-xs uppercase text-gray-400">Asset Name</div>
              <div className="mt-2 text-gray-700 dark:text-gray-200">
                {selectedAsset?.description ?? "—"}
              </div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-900/30">
              <div className="text-xs uppercase text-gray-400">Location</div>
              <div className="mt-2 text-gray-700 dark:text-gray-200">
                {selectedAsset?.location ?? "—"}
              </div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-900/30">
              <div className="text-xs uppercase text-gray-400">Department</div>
              <div className="mt-2 text-gray-700 dark:text-gray-200">
                {selectedAsset?.departmentName ?? "—"}
              </div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-900/30">
              <div className="text-xs uppercase text-gray-400">Model</div>
              <div className="mt-2 text-gray-700 dark:text-gray-200">
                {selectedAsset?.model ?? "—"}
              </div>
            </div>
          </div>
        )}

        {activeTab === "Readings" && (
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900/30 dark:text-gray-300">
            Asset readings are captured via the MEX Asset Reading service. Use the readings API to
            submit new readings tied to this asset.
          </div>
        )}

        {activeTab === "Work Orders" && (
          <div className="space-y-3">
            {relatedWorkOrders.length === 0 && (
              <div className="text-sm text-gray-500">No work orders linked to this asset.</div>
            )}
            {relatedWorkOrders.map((order) => (
              <div
                key={order.workOrderId ?? order.workOrderNumber}
                className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-900/30"
              >
                <div className="font-semibold text-gray-800 dark:text-white/90">
                  {order.workOrderNumber ?? "Work order"}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Status: {order.status ?? "Unspecified"} · Scheduled {order.scheduledStartDate ?? "—"}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "Documents" && (
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-900/30 dark:text-gray-300">
            Document attachments are managed via the MEX document service. Upload and link documents
            using the SDK Help reference.
          </div>
        )}
      </MexMaintenanceDrawer>
    </div>
  );
}
