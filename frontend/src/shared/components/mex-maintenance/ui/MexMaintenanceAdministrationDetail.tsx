import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import Button from "../../../../template/tailAdmin/components/ui/button/Button";
import Input from "../../../../template/tailAdmin/components/form/input/InputField";
import Label from "../../../../template/tailAdmin/components/form/Label";
import MexMaintenanceDrawer from "./MexMaintenanceDrawer";
import { useMexMaintenanceServices } from "./mexMaintenanceServices";

const sectionConfig = {
  "departments": {
    title: "Departments",
    description: "Departments and cost center definitions.",
    columns: [
      { key: "departmentName", label: "Department" },
      { key: "departmentCode", label: "Code" },
      { key: "description", label: "Description" },
      { key: "isActive", label: "Active" },
    ],
    editable: false,
  },
  "job-types": {
    title: "Job Types",
    description: "Job type definitions for work classification.",
    columns: [
      { key: "jobTypeName", label: "Job Type" },
      { key: "jobTypeDescription", label: "Description" },
      { key: "isActive", label: "Active" },
    ],
    editable: false,
  },
  "priorities": {
    title: "Priorities",
    description: "Priority definitions for maintenance work orders.",
    columns: [
      { key: "priorityNumber", label: "Priority" },
      { key: "priorityDescription", label: "Description" },
      { key: "isActive", label: "Active" },
    ],
    editable: false,
  },
  "trade-codes": {
    title: "Trade Codes",
    description: "Trade codes and skill identifiers.",
    columns: [
      { key: "tradeCodeName", label: "Trade" },
      { key: "tradeCode", label: "Code" },
      { key: "tradeCodeDescription", label: "Description" },
      { key: "isActive", label: "Active" },
    ],
    editable: true,
  },
  "taxes": {
    title: "Taxes",
    description: "Tax definitions used in procurement.",
    columns: [
      { key: "taxName", label: "Tax" },
      { key: "taxRate", label: "Rate" },
      { key: "taxDescription", label: "Description" },
      { key: "isActive", label: "Active" },
    ],
    editable: false,
  },
  "currency-types": {
    title: "Currency Types",
    description: "Currency definitions and descriptions.",
    columns: [
      { key: "currencyTypeCode", label: "Code" },
      { key: "currencyTypeDescription", label: "Description" },
      { key: "isActive", label: "Active" },
    ],
    editable: true,
  },
  "bin-locations": {
    title: "Bin Locations",
    description: "Inventory bin locations and descriptions.",
    columns: [
      { key: "binLocationName", label: "Location" },
      { key: "binLocationCode", label: "Code" },
      { key: "description", label: "Description" },
      { key: "isActive", label: "Active" },
    ],
    editable: false,
  },
  "component-codes": {
    title: "Component Codes",
    description: "Component code master list.",
    columns: [
      { key: "componentCodeName", label: "Component" },
      { key: "componentCode", label: "Code" },
      { key: "componentCodeDescription", label: "Description" },
      { key: "isActive", label: "Active" },
    ],
    editable: false,
  },
} as const;

type SectionKey = keyof typeof sectionConfig;

type GenericRecord = Record<string, unknown> & { [key: string]: unknown };

export default function MexMaintenanceAdministrationDetail() {
  const { section } = useParams<{ section: SectionKey }>();
  const { isReady, config, services } = useMexMaintenanceServices();
  const [records, setRecords] = useState<GenericRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [formState, setFormState] = useState<Record<string, string | boolean>>({});
  const [actionedByContactId, setActionedByContactId] = useState("");
  const [recordId, setRecordId] = useState("");

  const configEntry = section ? sectionConfig[section] : null;

  const loadRecords = async () => {
    if (!services || !section) return;
    const result = await (section === "departments"
      ? services.departments.getAll()
      : section === "job-types"
        ? services.jobTypes.getAll()
        : section === "priorities"
          ? services.priorities.getAll()
          : section === "trade-codes"
            ? services.tradeCodes.getAll()
            : section === "taxes"
              ? services.taxes.getAll()
              : section === "currency-types"
                ? services.currencyTypes.getAll()
                : section === "bin-locations"
                  ? services.binLocations.getAll()
                  : services.componentCodes.getAll());

    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setRecords(result.value ?? []);
  };

  useEffect(() => {
    if (!isReady || !services || !section) return;
    setError(null);
    void loadRecords();
  }, [isReady, services, section]);

  const handleOpenCreate = () => {
    setMode("create");
    setRecordId("");
    setFormState({});
    setDrawerOpen(true);
  };

  const handleOpenEdit = (record: GenericRecord) => {
    setMode("edit");
    setRecordId(String(record.tradeCodeId ?? record.currencyTypeId ?? ""));
    setFormState({
      tradeCodeName: String(record.tradeCodeName ?? ""),
      tradeCode: String(record.tradeCode ?? ""),
      tradeCodeDescription: String(record.tradeCodeDescription ?? ""),
      currencyTypeCode: String(record.currencyTypeCode ?? ""),
      currencyTypeDescription: String(record.currencyTypeDescription ?? ""),
      isActive: Boolean(record.isActive ?? true),
    });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!services || !section) return;
    if (!actionedByContactId.trim()) {
      setError("Actioned by contact ID is required.");
      return;
    }
    const actionedId = Number(actionedByContactId);
    if (!Number.isFinite(actionedId)) {
      setError("Actioned by contact ID must be numeric.");
      return;
    }

    if (section === "trade-codes") {
      const payload = {
        tradeCodeName: formState.tradeCodeName?.toString(),
        tradeCode: formState.tradeCode?.toString(),
        tradeCodeDescription: formState.tradeCodeDescription?.toString(),
        isActive: Boolean(formState.isActive),
      };

      if (mode === "create") {
        const result = await services.tradeCodes.create(actionedId, payload);
        if (!result.ok) {
          setError(result.error.message);
          return;
        }
      } else {
        if (!recordId) {
          setError("Trade code ID is required for updates.");
          return;
        }
        const result = await services.tradeCodes.update(Number(recordId), actionedId, payload);
        if (!result.ok) {
          setError(result.error.message);
          return;
        }
      }
    }

    if (section === "currency-types") {
      const payload = {
        currencyTypeCode: formState.currencyTypeCode?.toString(),
        currencyTypeDescription: formState.currencyTypeDescription?.toString(),
        isActive: Boolean(formState.isActive),
      };

      if (mode === "create") {
        const result = await services.currencyTypes.create(actionedId, payload);
        if (!result.ok) {
          setError(result.error.message);
          return;
        }
      } else {
        if (!recordId) {
          setError("Currency type ID is required for updates.");
          return;
        }
        const result = await services.currencyTypes.update(Number(recordId), actionedId, payload);
        if (!result.ok) {
          setError(result.error.message);
          return;
        }
      }
    }

    setDrawerOpen(false);
    await loadRecords();
  };

  const displayRecords = useMemo(() => records, [records]);

  if (!isReady) {
    return (
      <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-sm text-yellow-900 dark:border-yellow-900/60 dark:bg-yellow-900/20 dark:text-yellow-100">
        Configure the MEX base URL and authentication first. Current base URL: {config.baseUrl || "not set"}.
      </div>
    );
  }

  if (!configEntry) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600 dark:border-gray-800 dark:bg-white/3 dark:text-gray-300">
        Select a valid administration category.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {configEntry.title}
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {configEntry.description}
          </p>
        </div>
        {configEntry.editable && (
          <Button size="sm" onClick={handleOpenCreate}>
            Add {configEntry.title}
          </Button>
        )}
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
              {configEntry.columns.map((column) => (
                <th key={column.key} className="px-4 py-3 text-left">
                  {column.label}
                </th>
              ))}
              {configEntry.editable && <th className="px-4 py-3 text-left">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {displayRecords.map((record) => (
              <tr key={String(record.id ?? record.departmentId ?? record.tradeCodeId ?? record.currencyTypeId ?? record.componentCodeId ?? record.binLocationId ?? record.jobTypeId ?? record.priorityId ?? record.taxId)} className="text-gray-700 dark:text-gray-200">
                {configEntry.columns.map((column) => (
                  <td key={column.key} className="px-4 py-3">
                    {column.key === "isActive"
                      ? record[column.key]
                        ? "Yes"
                        : "No"
                      : (record[column.key] as string | number | undefined) ?? "—"}
                  </td>
                ))}
                {configEntry.editable && (
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" onClick={() => handleOpenEdit(record)}>
                      Edit
                    </Button>
                  </td>
                )}
              </tr>
            ))}
            {displayRecords.length === 0 && (
              <tr>
                <td
                  className="px-4 py-6 text-center text-gray-500"
                  colSpan={configEntry.columns.length + (configEntry.editable ? 1 : 0)}
                >
                  No records returned from the SDK.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {configEntry.editable && (
        <MexMaintenanceDrawer
          isOpen={drawerOpen}
          title={mode === "create" ? `Add ${configEntry.title}` : `Edit ${configEntry.title}`}
          onClose={() => setDrawerOpen(false)}
          footer={
            <div className="flex items-center justify-end gap-3">
              <Button variant="outline" size="sm" onClick={() => setDrawerOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
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
                <Label>{configEntry.title} ID</Label>
                <Input value={recordId} onChange={(event) => setRecordId(event.target.value)} />
              </div>
            )}
            {section === "trade-codes" && (
              <>
                <div>
                  <Label>Trade Code Name</Label>
                  <Input
                    value={String(formState.tradeCodeName ?? "")}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, tradeCodeName: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Trade Code</Label>
                  <Input
                    value={String(formState.tradeCode ?? "")}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, tradeCode: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={String(formState.tradeCodeDescription ?? "")}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, tradeCodeDescription: event.target.value }))
                    }
                  />
                </div>
              </>
            )}
            {section === "currency-types" && (
              <>
                <div>
                  <Label>Currency Code</Label>
                  <Input
                    value={String(formState.currencyTypeCode ?? "")}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, currencyTypeCode: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input
                    value={String(formState.currencyTypeDescription ?? "")}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, currencyTypeDescription: event.target.value }))
                    }
                  />
                </div>
              </>
            )}
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
      )}
    </div>
  );
}
