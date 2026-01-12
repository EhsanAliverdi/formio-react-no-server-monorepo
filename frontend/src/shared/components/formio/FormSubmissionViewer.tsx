import { useEffect, useRef } from "react";
import { Formio } from "formiojs";
import { installImageUploadComponent } from "./components/installImageUploadComponent";

type Props = {
  form: unknown;
  data: unknown;
};

type AnyRecord = Record<string, unknown>;

function isObject(x: unknown): x is AnyRecord {
  return !!x && typeof x === "object";
}

function removeSubmitButtons(schema: unknown): unknown {
  if (!isObject(schema)) return schema;

  const clone = structuredClone(schema) as AnyRecord;

  const stripFromItems = (items: unknown[]): unknown[] => {
    const out: unknown[] = [];
    for (const item of items) {
      if (!isObject(item)) {
        out.push(item);
        continue;
      }

      const type = typeof item.type === "string" ? item.type : "";
      if (type === "button") {
        const action = typeof item.action === "string" ? item.action : "";
        if (action.toLowerCase() === "submit") {
          continue;
        }
      }

      const next: AnyRecord = { ...item };

      if (Array.isArray(next.components)) {
        next.components = stripFromItems(next.components);
      }

      if (Array.isArray(next.columns)) {
        next.columns = next.columns.map((c) => {
          if (!isObject(c)) return c;
          const col = { ...c } as AnyRecord;
          if (Array.isArray(col.components)) {
            col.components = stripFromItems(col.components);
          }
          return col;
        });
      }

      out.push(next);
    }
    return out;
  };

  if (Array.isArray(clone.components)) {
    clone.components = stripFromItems(clone.components);
  }

  return clone;
}

export default function FormSubmissionViewer({ form, data }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Ensure custom components (like Image Upload) are registered for view mode too.
  // (Still readOnly, but required for proper rendering of stored file values.)
  installImageUploadComponent(Formio as any);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!form) return;

    let instance: any;
    containerRef.current.innerHTML = "";

    const schemaForView = removeSubmitButtons(form);

    Formio.createForm(containerRef.current, schemaForView as any, { readOnly: true }).then((formInstance: any) => {
      instance = formInstance;

      const submission = { data: isObject(data) ? data : {} };
      if (typeof formInstance.setSubmission === "function") {
        formInstance.setSubmission(submission);
      } else {
        formInstance.submission = submission;
      }
    });

    return () => {
      if (instance) instance.destroy(true);
    };
  }, [form, data]);

  return (
    <div className="formio-scope">
      <div ref={containerRef} />
    </div>
  );
}
