import { useEffect, useMemo, useState } from "react";
import MexMaintenanceDrawer from "./MexMaintenanceDrawer";
import type { SupplierInvoiceDTO } from "../services/modules/supplier-invoice";
import type { SupplierDTO } from "../services/modules/supplier";
import { useMexMaintenanceServices } from "./mexMaintenanceServices";

const formatDate = (value?: string) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
};

const toCurrency = (amount?: number) =>
  typeof amount === "number"
    ? amount.toLocaleString(undefined, { style: "currency", currency: "USD" })
    : "—";

export default function MexMaintenanceSupplierInvoices() {
  const { isReady, config, services } = useMexMaintenanceServices();
  const [invoices, setInvoices] = useState<SupplierInvoiceDTO[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<SupplierInvoiceDTO | null>(null);

  useEffect(() => {
    if (!isReady || !services) return;
    const load = async () => {
      setError(null);
      const [invoiceResult, supplierResult] = await Promise.all([
        services.supplierInvoices.getAll(),
        services.suppliers.getAll(),
      ]);

      if (!invoiceResult.ok) {
        setError(invoiceResult.error.message);
        return;
      }
      if (!supplierResult.ok) {
        setError(supplierResult.error.message);
        return;
      }

      setInvoices(invoiceResult.value ?? []);
      setSuppliers(supplierResult.value ?? []);
    };

    void load();
  }, [isReady, services]);

  const supplierLookup = useMemo(() => {
    return suppliers.reduce<Record<string, string>>((acc, supplier) => {
      if (supplier.supplierId) {
        acc[String(supplier.supplierId)] =
          supplier.companyName ?? supplier.supplierName ?? `Supplier ${supplier.supplierId}`;
      }
      return acc;
    }, {});
  }, [suppliers]);

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
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Supplier invoices</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Review supplier invoices and payment status.
        </p>
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
              <th className="px-4 py-3 text-left">Invoice Number</th>
              <th className="px-4 py-3 text-left">Supplier</th>
              <th className="px-4 py-3 text-left">Invoice Date</th>
              <th className="px-4 py-3 text-left">Amount</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {invoices.map((invoice) => (
              <tr
                key={invoice.supplierInvoiceId ?? invoice.supplierInvoiceNumber}
                className="cursor-pointer text-gray-700 transition hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-900/50"
                onClick={() => setSelectedInvoice(invoice)}
              >
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white/90">
                  {invoice.supplierInvoiceNumber ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {invoice.supplierName ??
                    (invoice.supplierId ? supplierLookup[String(invoice.supplierId)] : "—")}
                </td>
                <td className="px-4 py-3">{formatDate(invoice.invoiceDate)}</td>
                <td className="px-4 py-3">{toCurrency(invoice.totalAmount)}</td>
                <td className="px-4 py-3">{invoice.status ?? (invoice.isPaid ? "Paid" : "Pending")}</td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={5}>
                  No supplier invoices returned from the SDK.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <MexMaintenanceDrawer
        isOpen={Boolean(selectedInvoice)}
        title={selectedInvoice?.supplierInvoiceNumber ?? "Supplier invoice"}
        onClose={() => setSelectedInvoice(null)}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-900/30">
            <div className="text-xs uppercase text-gray-400">Supplier</div>
            <div className="mt-2 text-gray-700 dark:text-gray-200">
              {selectedInvoice?.supplierName ??
                (selectedInvoice?.supplierId
                  ? supplierLookup[String(selectedInvoice.supplierId)]
                  : "—")}
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-900/30">
            <div className="text-xs uppercase text-gray-400">Invoice Date</div>
            <div className="mt-2 text-gray-700 dark:text-gray-200">
              {formatDate(selectedInvoice?.invoiceDate)}
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-900/30">
            <div className="text-xs uppercase text-gray-400">Amount</div>
            <div className="mt-2 text-gray-700 dark:text-gray-200">
              {toCurrency(selectedInvoice?.totalAmount)}
            </div>
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-900/30">
            <div className="text-xs uppercase text-gray-400">Due Date</div>
            <div className="mt-2 text-gray-700 dark:text-gray-200">
              {formatDate(selectedInvoice?.dueDate)}
            </div>
          </div>
        </div>
      </MexMaintenanceDrawer>
    </div>
  );
}
