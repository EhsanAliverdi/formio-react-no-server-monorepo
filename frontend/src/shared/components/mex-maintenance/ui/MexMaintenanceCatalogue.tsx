import { useEffect, useMemo, useState } from "react";
import Input from "../../../../template/tailAdmin/components/form/input/InputField";
import Label from "../../../../template/tailAdmin/components/form/Label";
import type { CatalogueDTO } from "../services/modules/catalogue";
import type { TaxDTO } from "../services/modules/tax";
import { useMexMaintenanceServices } from "./mexMaintenanceServices";

export default function MexMaintenanceCatalogue() {
  const { isReady, config, services } = useMexMaintenanceServices();
  const [catalogue, setCatalogue] = useState<CatalogueDTO[]>([]);
  const [taxes, setTaxes] = useState<TaxDTO[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady || !services) return;
    const load = async () => {
      setError(null);
      const [catalogueResult, taxResult] = await Promise.all([
        services.catalogue.getAll(),
        services.taxes.getAll(),
      ]);

      if (!catalogueResult.ok) {
        setError(catalogueResult.error.message);
        return;
      }
      if (!taxResult.ok) {
        setError(taxResult.error.message);
        return;
      }

      setCatalogue(catalogueResult.value ?? []);
      setTaxes(taxResult.value ?? []);
    };

    void load();
  }, [isReady, services]);

  const taxLookup = useMemo(() => {
    return taxes.reduce<Record<string, string>>((acc, tax) => {
      if (tax.taxId) {
        acc[String(tax.taxId)] = tax.taxName ?? tax.taxDescription ?? `Tax ${tax.taxId}`;
      }
      return acc;
    }, {});
  }, [taxes]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return catalogue.filter((item) => {
      if (!query) return true;
      return [item.catalogueNumber, item.description, item.uom]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(query));
    });
  }, [catalogue, search]);

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
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Catalogue</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Search catalogue items, consumables, and stocked materials.
          </p>
        </div>
        <div className="min-w-[220px]">
          <Label>Search</Label>
          <Input
            placeholder="Catalogue number, description, or UOM"
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
              <th className="px-4 py-3 text-left">Catalogue Number</th>
              <th className="px-4 py-3 text-left">Description</th>
              <th className="px-4 py-3 text-left">UOM</th>
              <th className="px-4 py-3 text-left">Tax</th>
              <th className="px-4 py-3 text-left">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {filtered.map((item) => (
              <tr key={item.catalogueId ?? item.catalogueNumber} className="text-gray-700 dark:text-gray-200">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white/90">
                  {item.catalogueNumber ?? "—"}
                </td>
                <td className="px-4 py-3">{item.description ?? "—"}</td>
                <td className="px-4 py-3">{item.uom ?? "—"}</td>
                <td className="px-4 py-3">
                  {item.taxId ? taxLookup[String(item.taxId)] : "—"}
                </td>
                <td className="px-4 py-3">{item.isActive ? "Yes" : "No"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={5}>
                  No catalogue records returned from the SDK.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
