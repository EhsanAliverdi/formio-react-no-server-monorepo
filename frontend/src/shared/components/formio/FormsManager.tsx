import { useMemo, useRef, useState, type ChangeEvent } from "react";
import toast from "react-hot-toast";
import { FaRegFileAlt } from "react-icons/fa";

import Button from "../../../template/tailAdmin/components/ui/button/Button";
import { ReactIconFromKey } from "../ui/ReactIconFromKey";

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
  visibility?: "public" | "restricted";
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

type FormListIconSettings = {
  show?: boolean;
  iconKey?: string;
  imageDataUrl?: string;
};

function getIconSettings(schema: unknown): FormListIconSettings {
  const obj = schema && typeof schema === "object" ? (schema as Record<string, unknown>) : null;
  const appSettings =
    obj && typeof obj.appSettings === "object" && obj.appSettings
      ? (obj.appSettings as Record<string, unknown>)
      : null;

  return {
    show: appSettings?.showIconInFormsList === false ? false : true,
    iconKey: typeof appSettings?.formsListIconKey === "string" ? (appSettings.formsListIconKey as string) : undefined,
    imageDataUrl:
      typeof appSettings?.formsListImageDataUrl === "string"
        ? (appSettings.formsListImageDataUrl as string)
        : undefined,
  };
}

function getPublicDescription(schema: unknown): string | undefined {
  const obj = schema && typeof schema === "object" ? (schema as Record<string, unknown>) : null;
  const appSettings =
    obj && typeof obj.appSettings === "object" && obj.appSettings
      ? (obj.appSettings as Record<string, unknown>)
      : null;
  const description = typeof appSettings?.publicDescription === "string" ? (appSettings.publicDescription as string) : "";
  const trimmed = description.trim();
  return trimmed ? trimmed : undefined;
}

function summarizeWords(text: string, maxWords: number): string {
  const words = text
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}...`;
}

type FormioComponent = Record<string, unknown>;

const NON_QUESTION_TYPES = new Set([
  "button",
  "content",
  "htmlelement",
  "well",
  "panel",
  "fieldset",
  "columns",
  "table",
  "tabs",
  "container",
  "row",
]);

function isWizardForm(schema: unknown): boolean {
  const obj = schema && typeof schema === "object" ? (schema as FormioComponent) : null;
  return !!obj && obj.display === "wizard";
}

function countWizardSteps(schema: unknown): number {
  const obj = schema && typeof schema === "object" ? (schema as FormioComponent) : null;
  const rootComponents = obj && Array.isArray(obj.components) ? obj.components : [];

  // In Form.io, wizard steps are typically represented as top-level panels.
  const panels = rootComponents.filter((c) => {
    if (!c || typeof c !== "object") return false;
    const co = c as FormioComponent;
    return co.type === "panel";
  });

  if (panels.length > 0) return panels.length;

  // Fallback: if it is a wizard but panels aren't present, treat as single step.
  return isWizardForm(schema) ? 1 : 0;
}

function countQuestions(schema: unknown): number {
  const root = schema && typeof schema === "object" ? (schema as FormioComponent) : null;
  const seen = new Set<unknown>();

  const walk = (node: unknown): number => {
    if (!node || typeof node !== "object") return 0;
    if (seen.has(node)) return 0;
    seen.add(node);

    const obj = node as FormioComponent;
    let count = 0;

    const type = typeof obj.type === "string" ? String(obj.type) : "";
    const key = typeof obj.key === "string" ? obj.key.trim() : "";

    // Treat leaf-like input components as questions.
    // Many Form.io inputs have input=true, but it is not always present; key is a good proxy.
    const isContainer =
      NON_QUESTION_TYPES.has(type) ||
      Array.isArray(obj.components) ||
      Array.isArray(obj.columns) ||
      Array.isArray(obj.rows) ||
      Array.isArray(obj.tabs);

    const isQuestion = !!key && !isContainer && type !== "button";
    if (isQuestion) count += 1;

    const components = Array.isArray(obj.components) ? obj.components : null;
    if (components) for (const c of components) count += walk(c);

    const columns = Array.isArray(obj.columns) ? obj.columns : null;
    if (columns) {
      for (const col of columns) {
        const colObj = col && typeof col === "object" ? (col as FormioComponent) : null;
        const colComponents = colObj && Array.isArray(colObj.components) ? colObj.components : null;
        if (colComponents) for (const c of colComponents) count += walk(c);
      }
    }

    const rows = Array.isArray(obj.rows) ? obj.rows : null;
    if (rows) {
      for (const row of rows) {
        if (!Array.isArray(row)) continue;
        for (const cell of row) {
          const cellObj = cell && typeof cell === "object" ? (cell as FormioComponent) : null;
          const cellComponents = cellObj && Array.isArray(cellObj.components) ? cellObj.components : null;
          if (cellComponents) for (const c of cellComponents) count += walk(c);
        }
      }
    }

    const tabs = Array.isArray(obj.tabs) ? obj.tabs : null;
    if (tabs) {
      for (const tab of tabs) {
        const tabObj = tab && typeof tab === "object" ? (tab as FormioComponent) : null;
        const tabComponents = tabObj && Array.isArray(tabObj.components) ? tabObj.components : null;
        if (tabComponents) for (const c of tabComponents) count += walk(c);
      }
    }

    return count;
  };

  return root ? walk(root) : 0;
}

function FormIcon({ schema }: { schema: unknown }) {
  const settings = getIconSettings(schema);
  if (settings.show === false) return null;

  if (settings.imageDataUrl) {
    return (
      <img
        src={settings.imageDataUrl}
        alt="Form"
        className="h-8 w-8 rounded-lg object-cover border border-gray-200"
      />
    );
  }

  return (
    <div className="h-8 w-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center">
      <ReactIconFromKey iconKey={settings.iconKey} fallback={FaRegFileAlt} className="h-4 w-4 text-gray-700" />
    </div>
  );
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

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const sortedForms = useMemo(() => {
    return [...forms].sort((a, b) => a.name.localeCompare(b.name));
  }, [forms]);

  const formsWithMeta = useMemo(() => {
    return sortedForms.map((form) => {
      const description = getPublicDescription(form.schema);
      const questionsTotal = countQuestions(form.schema);
      const wizard = isWizardForm(form.schema);
      const steps = wizard ? Math.max(1, countWizardSteps(form.schema)) : 0;
      return {
        ...form,
        description,
        descriptionSummary: description ? summarizeWords(description, 15) : undefined,
        questionsTotal,
        isWizard: wizard,
        steps,
      };
    });
  }, [sortedForms]);

  const filteredForms = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return formsWithMeta;
    return formsWithMeta.filter((f) => {
      const name = (f.name || "").toLowerCase();
      const desc = (f.description || "").toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [formsWithMeta, search]);

  const totalPages = useMemo(() => {
    const t = Math.ceil(filteredForms.length / Math.max(1, pageSize));
    return Math.max(1, t);
  }, [filteredForms.length, pageSize]);

  const currentPage = Math.min(Math.max(1, page), totalPages);

  const pagedForms = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredForms.slice(start, start + pageSize);
  }, [filteredForms, currentPage, pageSize]);

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
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search forms…"
            aria-label="Search forms"
            className="w-full max-w-[18rem] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400"
            type="search"
          />

          <select
            value={String(pageSize)}
            onChange={(e) => {
              const next = Number(e.target.value);
              setPageSize(Number.isFinite(next) && next > 0 ? next : 10);
              setPage(1);
            }}
            className="hidden sm:block rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-800"
            aria-label="Rows per page"
          >
            <option value="10">10 / page</option>
            <option value="25">25 / page</option>
            <option value="50">50 / page</option>
          </select>

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void onImportFileChange(e)}
          />

          <Button variant="outline" size="xsm" onClick={onImportClick} disabled={importing}>
            {importing ? "Importing…" : "Import"}
          </Button>

          <Button variant="primary" size="xsm" onClick={onAdd}>
            New
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
      ) : filteredForms.length === 0 ? (
        <p className="text-gray-500">No forms created yet.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <table className="min-w-full">
              <thead className="border-b border-gray-100 dark:border-white/[0.05]">
                <tr>
                  <th className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Form</th>
                  <th className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">Visibility</th>
                  <th className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-44">Structure</th>
                  <th className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400 w-64">Description</th>
                  <th className="px-5 py-3 font-medium text-gray-500 text-end text-theme-xs dark:text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {pagedForms.map((form) => (
                  <tr key={form.id}>
                    <td className="px-5 py-4 text-start">
                      <div className="flex items-center gap-3 min-w-56">
                        <FormIcon schema={form.schema} />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-800 dark:text-white/90 truncate">
                            {form.name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-start">
                      {form.visibility ? (
                        <span
                          className={
                            form.visibility === "public"
                              ? "inline-flex items-center rounded-md border border-green-200 bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700"
                              : "inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700"
                          }
                        >
                          {form.visibility === "public" ? "Public" : "Restricted"}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-start w-44">
                      <div className="text-sm text-gray-800 dark:text-white/90 whitespace-nowrap">
                        <div className="text-xs font-semibold text-sky-700 dark:text-sky-300">
                          Steps: {form.isWizard ? form.steps : "-"}
                        </div>
                        <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                          Questions: {form.questionsTotal}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-start w-64">
                      {form.descriptionSummary ? (
                        <span className="block max-w-64 text-sm text-gray-700 dark:text-gray-300 truncate" title={form.description ?? ""}>
                          {form.descriptionSummary}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">—</span>
                      )}
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

          <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-3 text-sm text-gray-600">
            <div>
              Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredForms.length)} of {filteredForms.length}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                Prev
              </button>
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              <button
                type="button"
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 disabled:opacity-50"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                Next
              </button>
            </div>
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
