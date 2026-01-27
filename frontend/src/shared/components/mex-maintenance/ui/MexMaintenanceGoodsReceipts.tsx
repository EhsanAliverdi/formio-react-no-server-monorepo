import { useState } from "react";
import Button from "../../../../template/tailAdmin/components/ui/button/Button";
import Input from "../../../../template/tailAdmin/components/form/input/InputField";
import Label from "../../../../template/tailAdmin/components/form/Label";
import type { GoodsReceiptDTO } from "../services/modules/goods-receipt";
import { useMexMaintenanceServices } from "./mexMaintenanceServices";

const formatDate = (value?: string) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
};

export default function MexMaintenanceGoodsReceipts() {
  const { isReady, config, services } = useMexMaintenanceServices();
  const [poNumber, setPoNumber] = useState("");
  const [receipts, setReceipts] = useState<GoodsReceiptDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!services) return;
    if (!poNumber.trim()) {
      setError("Enter a purchase order number to search.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await services.goodsReceipts.getByPurchaseOrderNumber(poNumber.trim());
    if (!result.ok) {
      setError(result.error.message);
      setLoading(false);
      return;
    }
    setReceipts(result.value ?? []);
    setLoading(false);
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
      <div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Goods receipts</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Search for goods receipts by purchase order number.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <Label>Purchase order number</Label>
            <Input
              value={poNumber}
              onChange={(event) => setPoNumber(event.target.value)}
              placeholder="PO Number"
            />
          </div>
          <Button size="sm" onClick={handleSearch}>
            Search
          </Button>
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
              <th className="px-4 py-3 text-left">PO Number</th>
              <th className="px-4 py-3 text-left">Receipt Date</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {receipts.map((receipt) => (
              <tr key={receipt.goodsReceiptId ?? receipt.purchaseOrderNumber} className="text-gray-700 dark:text-gray-200">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white/90">
                  {receipt.purchaseOrderNumber ?? "—"}
                </td>
                <td className="px-4 py-3">{formatDate(receipt.receiptDateTime)}</td>
                <td className="px-4 py-3">{receipt.isProcessed ? "Processed" : "Pending"}</td>
              </tr>
            ))}
            {receipts.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={3}>
                  {loading ? "Loading receipts..." : "No goods receipts found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
