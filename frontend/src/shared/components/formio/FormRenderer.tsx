import { useEffect, useMemo, useRef, useState } from "react";
import { Formio } from "formiojs";
import { installImageUploadComponent } from "./components/installImageUploadComponent";
import SubmissionPreview, { type PreviewItem } from "./SubmissionPreview";

type FormRendererProps = {
  form?: any;
  onSubmit?: (data: any) => void;
};

type FormAppSettings = {
  previewBeforeSubmit?: boolean;
  allowDraftPdfBeforeSubmit?: boolean;
};

function isObject(x: unknown): x is Record<string, unknown> {
  return !!x && typeof x === "object";
}

function buildLabelMap(schema: unknown): Record<string, string> {
  const map: Record<string, string> = {};

  const walk = (node: unknown) => {
    if (!isObject(node)) return;

    const key = typeof node.key === "string" ? node.key : "";
    const label = typeof node.label === "string" ? node.label : "";
    const type = typeof node.type === "string" ? node.type : "";

    if (key && label && type !== "button") {
      map[key] = label;
    }

    const components = node.components;
    if (Array.isArray(components)) {
      for (const c of components) walk(c);
    }

    const columns = node.columns;
    if (Array.isArray(columns)) {
      for (const col of columns) {
        if (!isObject(col)) continue;
        const colComps = col.components;
        if (Array.isArray(colComps)) {
          for (const c of colComps) walk(c);
        }
      }
    }
  };

  walk(schema);
  return map;
}

function toPreviewItems(labelMap: Record<string, string>, data: Record<string, unknown>): PreviewItem[] {
  const items: PreviewItem[] = [];
  for (const [key, raw] of Object.entries(data || {})) {
    const label = labelMap[key] || key;
    const value =
      raw === null || raw === undefined
        ? ""
        : typeof raw === "string"
          ? raw
          : typeof raw === "number" || typeof raw === "boolean"
            ? String(raw)
            : JSON.stringify(raw, null, 2);
    items.push({ label, value });
  }
  return items;
}

export default function FormRenderer({ form, onSubmit }: FormRendererProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pendingData, setPendingData] = useState<Record<string, unknown> | null>(null);
  const [pendingItems, setPendingItems] = useState<PreviewItem[]>([]);

  // Ensure custom components (like Image Upload) are available at render time.
  installImageUploadComponent(Formio as any);

  const appSettings: FormAppSettings = useMemo(() => {
    const raw = (form as any)?.appSettings;
    return raw && typeof raw === "object" ? (raw as FormAppSettings) : {};
  }, [form]);

  const ensureSubmitButton = (schema: any) => {
    if (!schema || typeof schema !== "object") return schema;
    const s = schema as Record<string, unknown>;
    const comps = Array.isArray(s.components) ? (s.components as unknown[]) : [];

    const hasSubmit = (items: unknown[]): boolean => {
      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const r = item as Record<string, unknown>;

        if (r.type === "button") {
          const action = typeof r.action === "string" ? r.action : "";
          if (action.toLowerCase() === "submit") return true;
        }

        const child = r.components;
        if (Array.isArray(child) && hasSubmit(child)) return true;

        const cols = r.columns;
        if (Array.isArray(cols)) {
          for (const c of cols) {
            if (!c || typeof c !== "object") continue;
            const cr = c as Record<string, unknown>;
            if (Array.isArray(cr.components) && hasSubmit(cr.components as unknown[])) return true;
          }
        }
      }
      return false;
    };

    if (hasSubmit(comps)) return schema;

    const nextComponents = [...comps];
    nextComponents.push({
      type: "button",
      key: "submit_auto",
      label: "Submit",
      action: "submit",
      theme: "primary",
      input: true,
    });

    return { ...s, components: nextComponents };
  };

  useEffect(() => {
    if (!form || !containerRef.current) return;

    let instance: any;

    const schemaForRender = ensureSubmitButton(structuredClone(form));
    const labelMap = buildLabelMap(schemaForRender);

    Formio.createForm(containerRef.current, schemaForRender).then((formInstance) => {
      instance = formInstance;
      formInstance.on("submit", (submission: any) => {
        const data = (submission && submission.data && typeof submission.data === "object") ? (submission.data as Record<string, unknown>) : {};

        if (appSettings.previewBeforeSubmit) {
          setPendingData(data);
          setPendingItems(toPreviewItems(labelMap, data));
          setPreviewOpen(true);
          return;
        }

        if (onSubmit) onSubmit(data);
        else alert("Form submitted successfully!");
      });
    });

    return () => {
      if (instance) {
        instance.destroy(true);
      }
    };
  }, [form, onSubmit]);

  if (!form) {
    return <div className="p-6 text-center text-gray-500">No form loaded</div>;
  }

  if (!form.components || form.components.length === 0) {
    return <div className="p-6 text-center text-gray-500">Form has no fields</div>;
  }

  const title =
    typeof form?.title === "string" && form.title.trim()
      ? form.title
      : typeof form?.name === "string" && form.name.trim()
        ? form.name
        : "Review before submission";

  return (
    <div className="w-full">
      {previewOpen && pendingData && (
        <SubmissionPreview
          title={title}
          items={pendingItems}
          allowPdfDownload={!!appSettings.allowDraftPdfBeforeSubmit}
          onBack={() => setPreviewOpen(false)}
          onConfirmSubmit={() => {
            const data = pendingData;
            setPreviewOpen(false);
            setPendingData(null);
            setPendingItems([]);
            if (onSubmit) onSubmit(data);
            else alert("Form submitted successfully!");
          }}
        />
      )}

      <div className={previewOpen ? "hidden" : "block"}>
        <div className="formio-scope">
          <div ref={containerRef} />
        </div>
      </div>
    </div>
  );
}
