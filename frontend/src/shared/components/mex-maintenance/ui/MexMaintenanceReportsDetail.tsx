import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import type { SupplierInvoiceDTO } from "../services/modules/supplier-invoice";
import type { WorkOrderDTO } from "../services/modules/work-order";
import type { WorkOrderSpareDTO } from "../services/modules/work-order-spare";
import type { WorkOrderTradeDTO } from "../services/modules/work-order-trade";
import { useMexMaintenanceServices } from "./mexMaintenanceServices";

type ReportId = "backlog" | "labour-vs-spares" | "supplier-spend" | "asset-maintenance-cost";

const reportTitles: Record<ReportId, { title: string; description: string }> = {
  backlog: {
    title: "Maintenance Backlog",
    description: "Open work orders awaiting completion.",
  },
  "labour-vs-spares": {
    title: "Labour vs Spares Cost",
    description: "Compare labour and spare part costs across work orders.",
  },
  "supplier-spend": {
    title: "Supplier Spend",
    description: "Invoice totals aggregated by supplier.",
  },
  "asset-maintenance-cost": {
    title: "Asset Maintenance Cost",
    description: "Maintenance cost distribution by asset.",
  },
};

const toCurrency = (amount?: number) =>
  typeof amount === "number"
    ? amount.toLocaleString(undefined, { style: "currency", currency: "USD" })
    : "—";

export default function MexMaintenanceReportsDetail() {
  const { reportId } = useParams<{ reportId: ReportId }>();
  const { isReady, config, services } = useMexMaintenanceServices();
  const [workOrders, setWorkOrders] = useState<WorkOrderDTO[]>([]);
  const [workOrderTrades, setWorkOrderTrades] = useState<WorkOrderTradeDTO[]>([]);
  const [workOrderSpares, setWorkOrderSpares] = useState<WorkOrderSpareDTO[]>([]);
  const [supplierInvoices, setSupplierInvoices] = useState<SupplierInvoiceDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady || !services || !reportId) return;
    const load = async () => {
      setError(null);
      const [workOrderResult, tradeResult, spareResult, invoiceResult] = await Promise.all([
        services.workOrders.getAll(),
        services.workOrderTrades.getAll(),
        services.workOrderSpares.getAll(),
        services.supplierInvoices.getAll(),
      ]);

      if (!workOrderResult.ok) {
        setError(workOrderResult.error.message);
        return;
      }
      if (!tradeResult.ok) {
        setError(tradeResult.error.message);
        return;
      }
      if (!spareResult.ok) {
        setError(spareResult.error.message);
        return;
      }
      if (!invoiceResult.ok) {
        setError(invoiceResult.error.message);
        return;
      }

      setWorkOrders(workOrderResult.value ?? []);
      setWorkOrderTrades(tradeResult.value ?? []);
      setWorkOrderSpares(spareResult.value ?? []);
      setSupplierInvoices(invoiceResult.value ?? []);
    };

    void load();
  }, [isReady, reportId, services]);

  const openWorkOrders = useMemo(() => {
    return workOrders.filter((order) => !order.isClosed);
  }, [workOrders]);

  const labourCost = useMemo(() => {
    return workOrderTrades.reduce((sum, trade) => sum + (trade.totalCost ?? 0), 0);
  }, [workOrderTrades]);

  const sparesCost = useMemo(() => {
    return workOrderSpares.reduce((sum, spare) => sum + (spare.totalCost ?? 0), 0);
  }, [workOrderSpares]);

  const supplierSpend = useMemo(() => {
    const totals = supplierInvoices.reduce<Record<string, number>>((acc, invoice) => {
      const key = invoice.supplierName ?? String(invoice.supplierId ?? "Unknown");
      acc[key] = (acc[key] ?? 0) + (invoice.totalAmount ?? 0);
      return acc;
    }, {});
    return Object.entries(totals)
      .map(([supplier, total]) => ({ supplier, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [supplierInvoices]);

  const assetCosts = useMemo(() => {
    const workOrderLookup = workOrders.reduce<Record<string, number>>((acc, order) => {
      if (order.workOrderId && order.assetId) {
        acc[String(order.workOrderId)] = order.assetId;
      }
      return acc;
    }, {});

    const totals = new Map<number, number>();
    workOrderTrades.forEach((trade) => {
      const assetId = trade.workOrderId ? workOrderLookup[String(trade.workOrderId)] : undefined;
      if (!assetId) return;
      totals.set(assetId, (totals.get(assetId) ?? 0) + (trade.totalCost ?? 0));
    });
    workOrderSpares.forEach((spare) => {
      const assetId = spare.workOrderId ? workOrderLookup[String(spare.workOrderId)] : undefined;
      if (!assetId) return;
      totals.set(assetId, (totals.get(assetId) ?? 0) + (spare.totalCost ?? 0));
    });

    return Array.from(totals.entries())
      .map(([assetId, total]) => ({ assetId, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [workOrderSpares, workOrderTrades, workOrders]);

  if (!isReady) {
    return (
      <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-sm text-yellow-900 dark:border-yellow-900/60 dark:bg-yellow-900/20 dark:text-yellow-100">
        Configure the MEX base URL and authentication first. Current base URL: {config.baseUrl || "not set"}.
      </div>
    );
  }

  if (!reportId || !(reportId in reportTitles)) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600 dark:border-gray-800 dark:bg-white/3 dark:text-gray-300">
        Select a report to view.
      </div>
    );
  }

  const reportMeta = reportTitles[reportId];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">{reportMeta.title}</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{reportMeta.description}</p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      {reportId === "backlog" && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800/40 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">Work Order</th>
                <th className="px-4 py-3 text-left">Asset</th>
                <th className="px-4 py-3 text-left">Priority</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {openWorkOrders.map((order) => (
                <tr key={order.workOrderId ?? order.workOrderNumber} className="text-gray-700 dark:text-gray-200">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white/90">
                    {order.workOrderNumber ?? "—"}
                  </td>
                  <td className="px-4 py-3">{order.assetId ? `Asset #${order.assetId}` : "—"}</td>
                  <td className="px-4 py-3">{order.priorityId ?? "—"}</td>
                  <td className="px-4 py-3">{order.status ?? "Unspecified"}</td>
                </tr>
              ))}
              {openWorkOrders.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={4}>
                    No open work orders returned from the SDK.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {reportId === "labour-vs-spares" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
            <div className="text-xs uppercase tracking-wide text-gray-400">Labour cost</div>
            <div className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              {toCurrency(labourCost)}
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Total labour cost derived from work order trades.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
            <div className="text-xs uppercase tracking-wide text-gray-400">Spares cost</div>
            <div className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              {toCurrency(sparesCost)}
            </div>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Total spare part cost derived from work order spares.
            </p>
          </div>
        </div>
      )}

      {reportId === "supplier-spend" && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800/40 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">Supplier</th>
                <th className="px-4 py-3 text-left">Total Spend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {supplierSpend.map((item) => (
                <tr key={item.supplier} className="text-gray-700 dark:text-gray-200">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white/90">
                    {item.supplier}
                  </td>
                  <td className="px-4 py-3">{toCurrency(item.total)}</td>
                </tr>
              ))}
              {supplierSpend.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={2}>
                    No supplier spend data returned from the SDK.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {reportId === "asset-maintenance-cost" && (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800/40 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">Asset</th>
                <th className="px-4 py-3 text-left">Total Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {assetCosts.map((item) => (
                <tr key={item.assetId} className="text-gray-700 dark:text-gray-200">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white/90">
                    Asset #{item.assetId}
                  </td>
                  <td className="px-4 py-3">{toCurrency(item.total)}</td>
                </tr>
              ))}
              {assetCosts.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-gray-500" colSpan={2}>
                    No asset maintenance costs available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
