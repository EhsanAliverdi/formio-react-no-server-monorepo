import { useMemo, useRef, useState, type ChangeEvent } from "react";
import toast from "react-hot-toast";

import Button from "../../../template/tailAdmin/components/ui/button/Button";

type AnyRecord = Record<string, unknown>;

function isObject(value: unknown): value is AnyRecord {
  return !!value && typeof value === "object";
}

function firstNonEmptyString(...values: unknown[]): string | undefined {
  for (const v of values) {
    if (typeof v !== "string") continue;
    const trimmed = v.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return undefined;
}

export type ManagedForm = {
  id: number;
  name: string;
  schema: unknown;
};

type ImportedForm = {
  name: string;
  schema: AnyRecord;
  warnings: string[];
};

function validateImportedForm(payload: unknown): { ok: true; value: ImportedForm } | { ok: false; errors: string[] } {
  const errors: string[] = [];

  if (!isObject(payload)) {
    return { ok: false, errors: ["Root JSON must be an object."] };
  }

  const maybeWrappedSchema = (payload as AnyRecord).schema;
  const schemaCandidate = isObject(maybeWrappedSchema) ? maybeWrappedSchema : payload;

  if (!isObject(schemaCandidate)) {
    errors.push("Schema must be an object.");
  }

  const schema = schemaCandidate as AnyRecord;
  const components = schema.components;
  if (!Array.isArray(components)) {
    errors.push("Schema must include a 'components' array.");
  }

  const nameFromWrapper = (payload as AnyRecord).name;
  const nameFromSchema = schema.name;
  const titleFromSchema = schema.title;
  const name = firstNonEmptyString(nameFromWrapper, nameFromSchema, titleFromSchema);
  if (!name) {
    errors.push("Missing form name. Provide 'name' (preferred) or 'title'.");
  }

  if (errors.length) return { ok: false, errors };

  const warnings: string[] = [];
  if (!Array.isArray(components) || components.length === 0) {
    warnings.push("Schema has no components.");
  }
  if (schema.display !== undefined && schema.display !== "form" && schema.display !== "wizard") {
    warnings.push("Schema.display is not 'form' or 'wizard' (it will be saved as-is).");
  }

  return { ok: true, value: { name: name!, schema, warnings } };
}

function downloadJson(filename: string, data: unknown) {
  const text = JSON.stringify(data, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export type FormsManagerProps = {
  forms: ManagedForm[];
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;

  onAdd: () => void;
  onView: (id: number) => void;
  onEdit: (id: number) => void;

  onImportCreate: (payload: { name: string; schema: unknown }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
};

export default function FormsManager({
  forms,
  loading,
  error,
  onRefresh,
  onAdd,
  onView,
  onEdit,
  onImportCreate,
  onDelete,
}: FormsManagerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteName, setDeleteName] = useState<string>("");
  const [deleting, setDeleting] = useState(false);

  const sortedForms = useMemo(() => {
    return [...forms].sort((a, b) => a.name.localeCompare(b.name));
  }, [forms]);

  const onImportClick = () => {
    setImportErrors([]);
    setImportWarnings([]);
    fileInputRef.current?.click();
  };

  const onImportFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    // Allow importing the same file twice in a row.
    e.target.value = "";

    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json")) {
      setImportWarnings([]);
      setImportErrors(["Please select a .json file."]);
      return;
    }

    setImportErrors([]);
    setImportWarnings([]);
    setImporting(true);

    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        setImportErrors(["Invalid JSON: unable to parse file."]);
        return;
      }

      const result = validateImportedForm(parsed);
      if (!result.ok) {
        setImportErrors(result.errors);
        return;
      }

      const { name, schema, warnings } = result.value;
      setImportWarnings(warnings);

      await onImportCreate({ name, schema });
      toast.success("Form imported successfully!");
      await onRefresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setImportErrors([msg || "Failed to import form."]);
    } finally {
      setImporting(false);
    }
  };

  const onExportForm = (id: number) => {
    const f = forms.find((x) => x.id === id);
    if (!f) return;
    const safeName = String(f.name || "form")
      .trim()
      .replace(/[^a-z0-9-_]+/gi, "-");
    downloadJson(`form-${id}-${safeName}.json`, { name: f.name, schema: f.schema });
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-600">
            Create, edit, view, and delete forms. {loading ? "(Loading…)" : `(${forms.length} total)`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void onImportFileChange(e)}
          />

          <Button variant="outline" size="md" onClick={onImportClick} disabled={importing}>
            {importing ? "Importing…" : "Import"}
          </Button>

          <Button variant="primary" size="md" onClick={onAdd}>
            + Add New Form
          </Button>
        </div>
      </div>

      {(importErrors.length > 0 || importWarnings.length > 0) && (
        <div className="mb-4 rounded border border-gray-200 bg-white p-3">
          {importErrors.length > 0 && (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">
              <div className="font-semibold mb-1">Import errors</div>
              <ul className="list-disc pl-5">
                {importErrors.map((msg, i) => (
                  <li key={`${msg}-${i}`}>{msg}</li>
                ))}
              </ul>
            </div>
          )}

          {importWarnings.length > 0 && (
            <div className="mt-3 rounded border border-yellow-200 bg-yellow-50 p-3 text-yellow-800">
              <div className="font-semibold mb-1">Import warnings</div>
              <ul className="list-disc pl-5">
                {importWarnings.map((msg, i) => (
                  <li key={`${msg}-${i}`}>{msg}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {error && <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

      {loading ? (
        <p>Loading forms…</p>
      ) : forms.length === 0 ? (
        <p className="text-gray-500">No forms created yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-gray-100 dark:border-white/[0.05]">
                <tr>
                  <th className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                    Name
                  </th>
                  <th className="px-5 py-3 font-medium text-gray-500 text-end text-theme-xs dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {sortedForms.map((form) => (
                  <tr key={form.id}>
                    <td className="px-5 py-4 text-start">
                      <span className="text-sm font-medium text-gray-800 dark:text-white/90 whitespace-nowrap">
                        {form.name}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-end">
                      <div className="flex justify-end gap-2 whitespace-nowrap">
                        <Button variant="outline" size="sm" className="px-3! py-2! text-xs!" onClick={() => onView(form.id)}>
                          View
                        </Button>
                        <Button variant="outline" size="sm" className="px-3! py-2! text-xs!" onClick={() => onEdit(form.id)}>
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="px-3! py-2! text-xs!" onClick={() => onExportForm(form.id)}>
                          Export
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          className="px-3! py-2! text-xs! bg-red-600 hover:bg-red-700 disabled:bg-red-300"
                          onClick={() => {
                            setDeleteId(form.id);
                            setDeleteName(form.name);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {deleteId !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-sm relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              onClick={() => setDeleteId(null)}
              aria-label="Close"
              type="button"
            >
              ✕
            </button>
            <h2 className="text-lg font-semibold mb-4 text-red-600">Delete Form</h2>
            <p className="mb-6">
              Are you sure you want to delete <span className="font-semibold">{deleteName}</span>?
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setDeleteId(null)} disabled={deleting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-red-600 hover:bg-red-700 disabled:bg-red-300"
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await onDelete(deleteId);
                    toast.success("Form deleted successfully!");
                    await onRefresh();
                    setDeleteId(null);
                  } catch {
                    toast.error("Failed to delete form.");
                  } finally {
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
