import { useEffect, useRef } from "react";
import { Formio } from "formiojs";
import { normalizeUploadUrlsDeep } from "../../services/apiClient";
import { installImageUploadComponent } from "./components/installImageUploadComponent";

type Props = {
  form: unknown;
  data: unknown;
  onSubmit: (data: unknown) => void;
  submitLabel?: string;
};

type AnyRecord = Record<string, unknown>;

function isObject(x: unknown): x is AnyRecord {
  return !!x && typeof x === "object";
}

function hasSubmitButton(schema: AnyRecord): boolean {
  const items = Array.isArray(schema.components) ? schema.components : [];

  const walk = (comps: unknown[]): boolean => {
    for (const c of comps) {
      if (!isObject(c)) continue;
      const type = typeof c.type === "string" ? c.type : "";
      if (type === "button") {
        const action = typeof c.action === "string" ? c.action : "";
        if (action.toLowerCase() === "submit") return true;
      }
      const inner = Array.isArray(c.components) ? (c.components as unknown[]) : [];
      if (inner.length && walk(inner)) return true;

      const cols = Array.isArray(c.columns) ? (c.columns as unknown[]) : [];
      for (const col of cols) {
        if (!isObject(col)) continue;
        const colComps = Array.isArray(col.components) ? (col.components as unknown[]) : [];
        if (colComps.length && walk(colComps)) return true;
      }
    }
    return false;
  };

  return walk(items);
}

function ensureSubmitButton(schema: unknown, label: string): unknown {
  if (!isObject(schema)) return schema;
  const clone = structuredClone(schema) as AnyRecord;

  if (hasSubmitButton(clone)) return clone;

  const comps = Array.isArray(clone.components) ? clone.components : [];
  clone.components = [
    ...comps,
    {
      type: "button",
      key: "submit_admin_edit",
      label,
      action: "submit",
      theme: "primary",
      input: true,
    },
  ];

  return clone;
}

export default function FormSubmissionEditor({ form, data, onSubmit, submitLabel = "Save Changes" }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Ensure custom components (like Image Upload) are registered for edit mode.
  installImageUploadComponent(Formio as any);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!form) return;

    let instance: any;
    containerRef.current.innerHTML = "";

    const schemaForEdit = ensureSubmitButton(form, submitLabel);

    Formio.createForm(containerRef.current, schemaForEdit as any).then((formInstance: any) => {
      instance = formInstance;

      const submission = { data: normalizeUploadUrlsDeep(isObject(data) ? data : {}) };
      if (typeof formInstance.setSubmission === "function") {
        formInstance.setSubmission(submission);
      } else {
        formInstance.submission = submission;
      }

      formInstance.on("submit", (submissionValue: any) => {
        onSubmit((submissionValue && submissionValue.data) || {});
      });
    });

    return () => {
      if (instance) instance.destroy(true);
    };
  }, [form, data, onSubmit, submitLabel]);

  return (
    <div className="formio-scope">
      <div ref={containerRef} />
    </div>
  );
}
