import { useEffect, useState } from "react";
import Button from "../../../../template/tailAdmin/components/ui/button/Button";
import Input from "../../../../template/tailAdmin/components/form/input/InputField";
import Label from "../../../../template/tailAdmin/components/form/Label";
import MexMaintenanceDrawer from "./MexMaintenanceDrawer";
import type { SupplierDTO } from "../services/modules/supplier";
import { useMexMaintenanceServices } from "./mexMaintenanceServices";

const emptySupplier: SupplierDTO = {
  supplierCode: "",
  supplierName: "",
  companyName: "",
  contactName: "",
  phone: "",
  email: "",
  isActive: true,
};

export default function MexMaintenanceSuppliers() {
  const { isReady, config, services } = useMexMaintenanceServices();
  const [suppliers, setSuppliers] = useState<SupplierDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [formState, setFormState] = useState<SupplierDTO>(emptySupplier);
  const [actionedByContactId, setActionedByContactId] = useState("");
  const [supplierId, setSupplierId] = useState("");

  const loadSuppliers = async () => {
    if (!services) return;
    const result = await services.suppliers.getAll();
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setSuppliers(result.value ?? []);
  };

  useEffect(() => {
    if (!isReady || !services) return;
    setError(null);
    void loadSuppliers();
  }, [isReady, services]);

  const openCreate = () => {
    setMode("create");
    setFormState(emptySupplier);
    setSupplierId("");
    setDrawerOpen(true);
  };

  const openEdit = (supplier: SupplierDTO) => {
    setMode("edit");
    setFormState(supplier);
    setSupplierId(String(supplier.supplierId ?? ""));
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

    if (mode === "create") {
      const result = await services.suppliers.create(actionedId, formState);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
    } else {
      if (!supplierId.trim()) {
        setError("Supplier ID is required for updates.");
        return;
      }
      const result = await services.suppliers.update(Number(supplierId), actionedId, formState);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
    }

    setDrawerOpen(false);
    await loadSuppliers();
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
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Suppliers</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage supplier profiles and primary contacts.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          Add Supplier
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
              <th className="px-4 py-3 text-left">Supplier Code</th>
              <th className="px-4 py-3 text-left">Company Name</th>
              <th className="px-4 py-3 text-left">Contact</th>
              <th className="px-4 py-3 text-left">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {suppliers.map((supplier) => (
              <tr
                key={supplier.supplierId ?? supplier.supplierCode}
                className="cursor-pointer text-gray-700 transition hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-900/50"
                onClick={() => openEdit(supplier)}
              >
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white/90">
                  {supplier.supplierCode ?? "—"}
                </td>
                <td className="px-4 py-3">{supplier.companyName ?? supplier.supplierName ?? "—"}</td>
                <td className="px-4 py-3">{supplier.contactName ?? "—"}</td>
                <td className="px-4 py-3">{supplier.isActive ? "Yes" : "No"}</td>
              </tr>
            ))}
            {suppliers.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={4}>
                  No suppliers returned from the SDK.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <MexMaintenanceDrawer
        isOpen={drawerOpen}
        title={mode === "create" ? "Add supplier" : "Edit supplier"}
        onClose={() => setDrawerOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" size="sm" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSubmit}>
              {mode === "create" ? "Save" : "Update"}
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
              <Label>Supplier ID</Label>
              <Input value={supplierId} onChange={(event) => setSupplierId(event.target.value)} />
            </div>
          )}
          <div>
            <Label>Supplier Code</Label>
            <Input
              value={formState.supplierCode ?? ""}
              onChange={(event) => setFormState((prev) => ({ ...prev, supplierCode: event.target.value }))}
            />
          </div>
          <div>
            <Label>Company Name</Label>
            <Input
              value={formState.companyName ?? ""}
              onChange={(event) => setFormState((prev) => ({ ...prev, companyName: event.target.value }))}
            />
          </div>
          <div>
            <Label>Contact Name</Label>
            <Input
              value={formState.contactName ?? ""}
              onChange={(event) => setFormState((prev) => ({ ...prev, contactName: event.target.value }))}
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              value={formState.phone ?? ""}
              onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value }))}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              value={formState.email ?? ""}
              onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
            />
          </div>
          <div>
            <Label>Active</Label>
            <select
              value={formState.isActive ? "yes" : "no"}
              onChange={(event) =>
                setFormState((prev) => ({ ...prev, isActive: event.target.value === "yes" }))
              }
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>
      </MexMaintenanceDrawer>
    </div>
  );
}
