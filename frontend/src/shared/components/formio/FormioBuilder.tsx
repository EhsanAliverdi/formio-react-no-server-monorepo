import { useEffect, useRef } from "react";
import { Formio } from "formiojs";
import { installImageUploadComponent } from "./components/installImageUploadComponent";

type AnyRecord = Record<string, unknown>;

let abnormalitiesEditFormInstalled = false;

function installAbnormalitiesEditForm() {
  if (abnormalitiesEditFormInstalled) return;

  const components: Record<string, any> | undefined = (Formio as any)?.Components?.components;
  if (!components || typeof components !== "object") return;

  const addAbnormalitiesTab = (editForm: any) => {
    if (!editForm || typeof editForm !== "object") return editForm;

    const rootComponents = Array.isArray((editForm as AnyRecord).components)
      ? ((editForm as AnyRecord).components as unknown[])
      : [];

    const findTabs = (items: unknown[]): AnyRecord | null => {
      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const r = item as AnyRecord;
        if (r.type === "tabs" && Array.isArray(r.components)) return r;

        if (Array.isArray(r.components)) {
          const found = findTabs(r.components as unknown[]);
          if (found) return found;
        }
      }
      return null;
    };

    const tabs = findTabs(rootComponents);
    if (!tabs) return editForm;

    const tabItems = Array.isArray(tabs.components) ? (tabs.components as unknown[]) : [];
    const already = tabItems.some(
      (t) =>
        !!t &&
        typeof t === "object" &&
        ((t as AnyRecord).key === "abnormalities" || (t as AnyRecord).label === "Abnormalities")
    );
    if (already) return editForm;

    const abnormalTab = {
      key: "abnormalities",
      label: "Abnormalities",
      weight: 999,
      components: [
        {
          type: "checkbox",
          input: true,
          key: "properties.abnormal_enabled",
          label: "Enable Abnormalities",
          tooltip: "When enabled, submissions will be checked against the Normal Answer.",
        },
        {
          type: "textfield",
          input: true,
          key: "properties.abnormal_normal_value",
          label: "Normal Answer (Text)",
          placeholder: "Enter the normal/expected answer",
          conditional: {
            when: "properties.abnormal_enabled",
            eq: true,
          },
          customConditional:
            "show = (data && data.type && ['textfield','textarea','email','phoneNumber','password','url'].includes(data.type));",
        },
        {
          type: "number",
          input: true,
          key: "properties.abnormal_normal_value",
          label: "Normal Answer (Number)",
          conditional: {
            when: "properties.abnormal_enabled",
            eq: true,
          },
          customConditional:
            "show = (data && data.type && ['number'].includes(data.type));",
        },
        {
          type: "checkbox",
          input: true,
          key: "properties.abnormal_normal_value",
          label: "Normal Answer (Checked)",
          conditional: {
            when: "properties.abnormal_enabled",
            eq: true,
          },
          customConditional:
            "show = (data && data.type && ['checkbox'].includes(data.type));",
        },
        {
          type: "select",
          input: true,
          key: "properties.abnormal_normal_value",
          label: "Normal Answer",
          placeholder: "Select the normal/expected option",
          dataSrc: "custom",
          data: {
            custom:
              "const vals = (data && Array.isArray(data.values)) ? data.values : []; values = vals.map(v => ({ label: (v && (v.label || v.value)) || '', value: (v && v.value) }));",
          },
          conditional: {
            when: "properties.abnormal_enabled",
            eq: true,
          },
          customConditional:
            "show = (data && data.type && ['radio','select','selectboxes'].includes(data.type));",
        },
      ],
    };

    (tabs as AnyRecord).components = [...tabItems, abnormalTab];
    return editForm;
  };

  // Patch each component's editForm to inject our tab.
  for (const comp of Object.values(components)) {
    if (!comp) continue;
    const editFormFn = comp.editForm;
    if (typeof editFormFn !== "function") continue;

    if (editFormFn.__abnormalitiesPatched) continue;

    const wrapped = (...args: any[]) => addAbnormalitiesTab(editFormFn(...args));
    wrapped.__abnormalitiesPatched = true;
    comp.editForm = wrapped;
  }

  abnormalitiesEditFormInstalled = true;
}

type FormSchema = {
  type?: string;
  display?: string;
  title?: string;
  name?: string;
  path?: string;
  components?: unknown[];
  [key: string]: unknown;
};

type FormioBuilderInstance = {
  schema: FormSchema;
  on: (event: string, cb: () => void) => void;
  setForm: (schema: FormSchema) => Promise<unknown> | void;
  destroy: (deleteFromGlobal?: boolean) => void;
};

function initSidebarAccordion(root: HTMLElement): () => void {
  const getCollapseEl = (btn: Element): HTMLElement | null => {
    const target =
      (btn as HTMLElement).getAttribute("data-target") || (btn as HTMLElement).getAttribute("data-bs-target");
    if (!target) return null;
    if (!target.startsWith("#")) return null;
    return root.querySelector(target) as HTMLElement | null;
  };

  const setExpanded = (btn: Element, expanded: boolean) => {
    (btn as HTMLElement).setAttribute("aria-expanded", expanded ? "true" : "false");
  };

  const closeSiblings = (current: HTMLElement) => {
    const parentSel = current.getAttribute("data-parent") || current.getAttribute("data-bs-parent");
    if (!parentSel) return;
    const parent = root.querySelector(parentSel);
    if (!parent) return;

    const open = parent.querySelectorAll<HTMLElement>(".collapse.show");
    open.forEach((el) => {
      if (el === current) return;
      el.classList.remove("show");
      const btn = parent.querySelector(`[data-target="#${el.id}"],[data-bs-target="#${el.id}"]`);
      if (btn) setExpanded(btn, false);
    });
  };

  const onClick = (e: MouseEvent) => {
    const target = e.target as Element | null;
    if (!target) return;
    const btn = target.closest('button[data-toggle="collapse"],button[data-bs-toggle="collapse"]');
    if (!btn) return;

    const collapse = getCollapseEl(btn);
    if (!collapse) return;
    e.preventDefault();

    const isOpen = collapse.classList.contains("show");
    if (isOpen) {
      collapse.classList.remove("show");
      setExpanded(btn, false);
      return;
    }

    collapse.classList.add("show");
    setExpanded(btn, true);
    closeSiblings(collapse);
  };

  root.addEventListener("click", onClick);

  const defaultGroup = root.querySelector<HTMLElement>(
    '.builder-sidebar .collapse.show, .builder-sidebar .collapse[data-default="true"], .builder-sidebar .collapse[data-default="1"]'
  );
  if (defaultGroup) {
    defaultGroup.classList.add("show");
    const btn = root.querySelector(`[data-target="#${defaultGroup.id}"],[data-bs-target="#${defaultGroup.id}"]`);
    if (btn) setExpanded(btn, true);
  }

  return () => {
    root.removeEventListener("click", onClick);
  };
}

type FormioWithBuilderApi = {
  builder: (element: HTMLElement, schema: FormSchema, options: Record<string, unknown>) => Promise<FormioBuilderInstance>;
};

const BASE_FORM: FormSchema = {
  type: "form",
  display: "form",
  title: "Untitled Form",
  name: "untitled",
  path: "untitled",
  components: [],
};

function safeClone(form: unknown): FormSchema {
  const base = form && typeof form === "object" ? (form as FormSchema) : BASE_FORM;
  const cloned = structuredClone(base);
  if (!Array.isArray(cloned.components)) cloned.components = [];
  cloned.components = cloned.components.filter((c: unknown) => !!c && typeof c === "object");
  return cloned;
}

type Props = {
  form: FormSchema;
  onChange: (schema: FormSchema) => void;
};

export default function FormioBuilder({ form, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const builderRef = useRef<FormioBuilderInstance | null>(null);
  const latestFormRef = useRef<FormSchema>(form);
  const latestOnChangeRef = useRef<Props["onChange"]>(onChange);
  const lastEmittedSchemaJsonRef = useRef<string | null>(null);
  const lastAppliedExternalSchemaJsonRef = useRef<string | null>(null);
  const sidebarCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    latestFormRef.current = form;
  }, [form]);

  useEffect(() => {
    latestOnChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (builderRef.current) return;

    let cancelled = false;

    // Ensure the builder uses the backend API base for things like file uploads.
    installImageUploadComponent(Formio as any);

    installAbnormalitiesEditForm();

    const initialSchema = safeClone(latestFormRef.current);
    lastAppliedExternalSchemaJsonRef.current = JSON.stringify(initialSchema);

    const formio = Formio as unknown as FormioWithBuilderApi;
    formio
      .builder(containerRef.current, initialSchema, {
        project: false,
        saveDraft: false,
        noDefaultSubmitButton: true,
      })
      .then((builder) => {
        if (cancelled) {
          builder.destroy(true);
          return;
        }

        builderRef.current = builder;

        if (containerRef.current && !sidebarCleanupRef.current) {
          sidebarCleanupRef.current = initSidebarAccordion(containerRef.current);
        }

        builder.on("change", () => {
          const schema = structuredClone(builder.schema);
          lastEmittedSchemaJsonRef.current = JSON.stringify(schema);
          latestOnChangeRef.current(schema);
        });

        const latestSchema = safeClone(latestFormRef.current);
        const latestJson = JSON.stringify(latestSchema);
        if (latestJson !== lastAppliedExternalSchemaJsonRef.current) {
          lastAppliedExternalSchemaJsonRef.current = latestJson;
          builder.setForm(latestSchema);
        }
      });

    return () => {
      cancelled = true;
      if (sidebarCleanupRef.current) {
        sidebarCleanupRef.current();
        sidebarCleanupRef.current = null;
      }
      if (builderRef.current) builderRef.current.destroy(true);
      builderRef.current = null;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const builder = builderRef.current;
    if (!builder) return;

    const schema = safeClone(form);
    const json = JSON.stringify(schema);

    if (json === lastEmittedSchemaJsonRef.current) return;
    if (json === lastAppliedExternalSchemaJsonRef.current) return;

    lastAppliedExternalSchemaJsonRef.current = json;
    builder.setForm(schema);
  }, [form]);

  return (
    <div className="formio-scope">
      <div ref={containerRef} />
    </div>
  );
}
