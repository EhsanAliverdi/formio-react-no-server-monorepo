import { useEffect, useMemo, useState, type CSSProperties } from "react";
import toast from "react-hot-toast";
import FormioBuilder from "./FormioBuilder";
import SmartFormRenderer from "./SmartFormRenderer";
import Switch from "../../../template/tailAdmin/components/form/switch/Switch";
import Button from "../../../template/tailAdmin/components/ui/button/Button";
import Label from "../../../template/tailAdmin/components/form/Label";
import Input from "../../../template/tailAdmin/components/form/input/InputField";
import TextArea from "../../../template/tailAdmin/components/form/input/TextArea";
import Select from "../../../template/tailAdmin/components/form/Select";
import Checkbox from "../../../template/tailAdmin/components/form/input/Checkbox";
import { getFormById, type FormVisibility } from "../../services/formService";
import { getMyProfile, listUsers, type UserRow } from "../../services/userService";
import {
  FaRegFileAlt,
  FaClipboardList,
  FaTasks,
  FaUser,
  FaBell,
  FaWrench,
  FaExclamationTriangle,
} from "react-icons/fa";
import IconPickerModal from "../ui/IconPickerModal";
import { ReactIconFromKey } from "../ui/ReactIconFromKey";
import { parseIconKey, toIconKey } from "../ui/reactIconsRegistry";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type FormSchema = {
  components: unknown[];
} & Record<string, unknown>;

type FormAppSettings = {
  previewBeforeSubmit?: boolean;
  allowDraftPdfBeforeSubmit?: boolean;
  showIconInFormsList?: boolean;
  formsListIconKey?: string;
  formsListImageDataUrl?: string;
  publicDescription?: string;
};

const DEFAULT_REACT_ICON_KEY = "fa:FaRegFileAlt";

const FORM_LIST_ICON_OPTIONS = [
  { key: "file", label: "File", Icon: FaRegFileAlt },
  { key: "clipboard", label: "Checklist", Icon: FaClipboardList },
  { key: "tasks", label: "Tasks", Icon: FaTasks },
  { key: "user", label: "User", Icon: FaUser },
  { key: "bell", label: "Bell", Icon: FaBell },
  { key: "wrench", label: "Tools", Icon: FaWrench },
  { key: "warning", label: "Warning", Icon: FaExclamationTriangle },
] as const;

function getFormListIconNode(appSettings: FormAppSettings): React.ReactNode {
  const image = typeof appSettings.formsListImageDataUrl === "string" ? appSettings.formsListImageDataUrl : "";
  if (image) {
    return (
      <img
        src={image}
        alt="Form icon"
        className="h-10 w-10 rounded-lg object-cover"
      />
    );
  }

  const key = typeof appSettings.formsListIconKey === "string" ? appSettings.formsListIconKey : "";
  const parsed = parseIconKey(key);
  if (parsed) {
    return (
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 text-gray-700">
        <ReactIconFromKey iconKey={key} fallback={FaRegFileAlt} className="h-5 w-5" />
      </span>
    );
  }

  const found = FORM_LIST_ICON_OPTIONS.find((o) => o.key === key) ?? FORM_LIST_ICON_OPTIONS[0];
  const Icon = found.Icon;
  return (
    <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 text-gray-700">
      <Icon className="h-5 w-5" />
    </span>
  );
}

type FormDisplay = "form" | "wizard";

type FormSummary = {
  id: number;
  name: string;
  schema: unknown;
};

type FormAccessSettings = {
  visibility: FormVisibility;
  allowed_roles: Array<"admin" | "editor" | "viewer">;
  allowed_user_ids: number[];
};

type CommonProps = {
  forms: FormSummary[];
  loading: boolean;
  error: string | null;
  loadForms: () => Promise<void> | void;
  EMPTY_FORM: FormSchema;
  safeSchema: (schema: unknown) => FormSchema;
  onBack: () => void;
};

type Props =
  | (CommonProps & {
      mode: "add";
      formId?: never;
      onCreate: (payload: { name: string; schema: FormSchema; access: FormAccessSettings }) => Promise<void> | void;
    })
  | (CommonProps & {
      mode: "edit";
      formId: number | null;
      onUpdate: (id: number, payload: { name: string; schema: FormSchema; access: FormAccessSettings }) => Promise<void> | void;
    });

function getDisplay(schema: FormSchema): FormDisplay {
  return (schema.display === "wizard" ? "wizard" : "form") satisfies FormDisplay;
}

function ensureWizardHasPage(schema: FormSchema): FormSchema {
  const comps = Array.isArray(schema.components) ? schema.components : [];
  const hasPanel = comps.some(
    (c) => !!c && typeof c === "object" && (c as Record<string, unknown>).type === "panel"
  );

  if (hasPanel) {
    // Ensure panels have stable keys (needed for selection + DnD reorder).
    let changed = false;
    const nextComponents = comps.map((c, idx) => {
      if (!c || typeof c !== "object") return c;
      const r = c as Record<string, unknown>;
      if (r.type !== "panel") return c;
      const key = typeof r.key === "string" && r.key.trim() ? r.key : "";
      if (key) return c;
      changed = true;
      return {
        ...r,
        key: `page${idx + 1}`,
      };
    });

    return changed ? ({ ...schema, components: nextComponents } as FormSchema) : schema;
  }

  return {
    ...schema,
    components: [
      {
        type: "panel",
        breadcrumb: "Page 1",
        title: "Page 1",
        label: "Page 1",
        key: "page1",
        components: comps,
      },
    ],
  } as FormSchema;
}

function firstNonEmptyString(...values: unknown[]): string | undefined {
  for (const v of values) {
    if (typeof v !== "string") continue;
    const trimmed = v.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return undefined;
}

function wizardPanelTitle(panel: Record<string, unknown> | undefined, index: number): string {
  if (!panel) return `Step ${index + 1}`;
  return firstNonEmptyString(panel.breadcrumb, panel.title, panel.label, panel.key) ?? `Step ${index + 1}`;
}

type WizardPanelItem = {
  id: string;
  title: string;
};

function WizardStepPill({
  id,
  title,
  active,
  onSelect,
  onDelete,
}: {
  id: string;
  title: string;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        active
          ? "inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1"
          : "inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1"
      }
    >
      <button
        type="button"
        className={active ? "text-sm font-semibold text-blue-700" : "text-sm font-medium text-gray-800"}
        onClick={onSelect}
      >
        {title}
      </button>

      <button
        type="button"
        className={
          isDragging
            ? "inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-2 py-1 text-gray-700 cursor-grabbing"
            : "inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-2 py-1 text-gray-700 cursor-grab hover:bg-gray-50"
        }
        aria-label="Drag step"
        {...attributes}
        {...listeners}
      >
        <span className="text-base leading-none">⋮⋮</span>
      </button>

      <button
        type="button"
        className={
          active
            ? "inline-flex items-center justify-center rounded-md border border-red-200 bg-white px-2 py-1 text-red-700 hover:bg-red-50"
            : "inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-2 py-1 text-gray-600 hover:bg-gray-50"
        }
        aria-label="Delete step"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete();
        }}
      >
        <span className="text-base leading-none">×</span>
      </button>
    </div>
  );
}

function normalizedSchemaForSave(safeSchema: (x: unknown) => FormSchema, name: string, schema: FormSchema): FormSchema {
  const next = { ...schema };
  next.title = name;
  next.name = name;
  next.path = String(name)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return safeSchema(next);
}

export default function AdminFormEditor(props: Props) {
  const formId = props.mode === "edit" ? props.formId : null;
  const [initializedFor, setInitializedFor] = useState<"add" | "edit" | null>(null);

  const [draftName, setDraftName] = useState("");
  const [draftSchema, setDraftSchema] = useState<FormSchema>(props.EMPTY_FORM);
  const [activeWizardPageKey, setActiveWizardPageKey] = useState<string | null>(null);
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [renamingStep, setRenamingStep] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  const [visibility, setVisibility] = useState<FormVisibility>("public");
  const [allowedRoles, setAllowedRoles] = useState<Array<"admin" | "editor" | "viewer">>([]);
  const [allowedUserIds, setAllowedUserIds] = useState<number[]>([]);
  const [accessLoadedForId, setAccessLoadedForId] = useState<number | null>(null);

  const [currentUserRole, setCurrentUserRole] = useState<"admin" | "editor" | "viewer" | null>(null);
  const canAssignUsers = currentUserRole === "admin";

  const [users, setUsers] = useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  const activeForm = useMemo(() => {
    if (props.mode !== "edit") return null;
    if (formId === null) return null;
    return props.forms.find((f) => f.id === formId) ?? null;
  }, [props.forms, formId, props.mode]);

  useEffect(() => {
    if (currentUserRole !== null) return;
    getMyProfile()
      .then((me) => {
        setCurrentUserRole(me.role);
      })
      .catch(() => {
        setCurrentUserRole(null);
      });
  }, [currentUserRole]);

  useEffect(() => {
    if (!canAssignUsers) return;
    if (usersLoading) return;
    if (users.length > 0) return;

    setUsersLoading(true);
    listUsers({ activeOnly: true, limit: 500 })
      .then((rows) => setUsers(rows))
      .catch(() => setUsers([]))
      .finally(() => setUsersLoading(false));
  }, [canAssignUsers, users.length, usersLoading]);

  useEffect(() => {
    if (props.mode === "add") {
      if (initializedFor === "add") return;
      setDraftName("");
      setDraftSchema(props.EMPTY_FORM);
      setActiveWizardPageKey(null);
      setVisibility("public");
      setAllowedRoles([]);
      setAllowedUserIds([]);
      setAccessLoadedForId(null);
      setInitializedFor("add");
      return;
    }

    if (props.mode === "edit") {
      if (formId === null) return;
      if (props.loading) return;
      if (!activeForm) return;
      if (initializedFor === "edit") return;

      setDraftName(activeForm.name);
      setDraftSchema(props.safeSchema(activeForm.schema));
      setActiveWizardPageKey(null);
      setInitializedFor("edit");
    }
  }, [activeForm, formId, initializedFor, props, props.EMPTY_FORM]);

  useEffect(() => {
    if (props.mode !== "edit") return;
    if (formId === null) return;
    if (accessLoadedForId === formId) return;

    (async () => {
      const data: unknown = await getFormById(formId);
      if (!data || typeof data !== "object") return;
      const obj = data as Record<string, unknown>;

      const vis = obj.visibility === "restricted" ? "restricted" : "public";
      setVisibility(vis);

      const rolesRaw = Array.isArray(obj.allowed_roles) ? (obj.allowed_roles as unknown[]) : [];
      const roles = rolesRaw.filter(
        (r): r is "admin" | "editor" | "viewer" => r === "admin" || r === "editor" || r === "viewer"
      );
      setAllowedRoles(roles);

      const idsRaw = Array.isArray(obj.allowed_user_ids) ? (obj.allowed_user_ids as unknown[]) : [];
      const ids = idsRaw
        .map((v) => Number(v))
        .filter((n) => Number.isFinite(n) && n > 0);
      setAllowedUserIds(ids);
    })()
      .catch(() => {
        // Ignore; access settings are optional.
      })
      .finally(() => {
        setAccessLoadedForId(formId);
      });
  }, [accessLoadedForId, formId, props.mode]);

  const display = getDisplay(draftSchema);

  const appSettings: FormAppSettings = useMemo(() => {
    const raw =
      draftSchema && typeof draftSchema === "object"
        ? (draftSchema as Record<string, unknown>).appSettings
        : undefined;
    return raw && typeof raw === "object" ? (raw as FormAppSettings) : {};
  }, [draftSchema]);

  const setAppSettings = (updater: (prev: FormAppSettings) => FormAppSettings) => {
    setDraftSchema((prev) => {
      const prevSettingsRaw = (prev as unknown as Record<string, unknown>).appSettings;
      const prevSettings =
        prevSettingsRaw && typeof prevSettingsRaw === "object" ? (prevSettingsRaw as FormAppSettings) : {};
      return {
        ...prev,
        appSettings: updater(prevSettings),
      };
    });
  };

  const wizardPanels = useMemo(() => {
    const comps = Array.isArray(draftSchema.components) ? draftSchema.components : [];
    return comps
      .map((c) => (c && typeof c === "object" ? (c as Record<string, unknown>) : null))
      .filter((x): x is Record<string, unknown> => x !== null)
      .filter((c) => c.type === "panel" && Array.isArray(c.components));
  }, [draftSchema]);

  const wizardPanelItems = useMemo<WizardPanelItem[]>(() => {
    return wizardPanels.map((p, idx) => {
      const id = typeof p.key === "string" && p.key.trim() ? p.key : `page${idx + 1}`;
      return { id, title: wizardPanelTitle(p, idx) };
    });
  }, [wizardPanels]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const activeWizardPageIndex = useMemo(() => {
    if (display !== "wizard") return -1;
    if (wizardPanels.length === 0) return -1;
    if (!activeWizardPageKey) return 0;
    const idx = wizardPanels.findIndex((p) => p.key === activeWizardPageKey);
    return idx >= 0 ? idx : 0;
  }, [activeWizardPageKey, display, wizardPanels]);

  function handleReorderPages(event: DragEndEvent) {
    if (display !== "wizard") return;
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

    const oldIndex = wizardPanelItems.findIndex((p) => p.id === active.id);
    const newIndex = wizardPanelItems.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const nextOrder = arrayMove(wizardPanelItems, oldIndex, newIndex);
    const nextIds = nextOrder.map((p) => p.id);

    setDraftSchema((prev) => {
      const ensured = ensureWizardHasPage(props.safeSchema(prev));
      const prevComps = Array.isArray(ensured.components) ? ensured.components : [];

      const panels = prevComps
        .map((c) => (c && typeof c === "object" ? (c as Record<string, unknown>) : null))
        .filter((x): x is Record<string, unknown> => x !== null)
        .filter((c) => c.type === "panel" && Array.isArray(c.components));

      const idForPanel = (panel: Record<string, unknown>, idx: number) => {
        const key = typeof panel.key === "string" && panel.key.trim() ? panel.key : "";
        return key || `page${idx + 1}`;
      };

      const panelById = new Map<string, Record<string, unknown>>();
      panels.forEach((p, idx) => {
        panelById.set(idForPanel(p, idx), p);
      });

      const orderedPanels = nextIds
        .map((id) => panelById.get(id))
        .filter((p): p is Record<string, unknown> => !!p);

      let panelCursor = 0;
      const nextComponents = prevComps.map((c) => {
        if (!c || typeof c !== "object") return c;
        const r = c as Record<string, unknown>;
        if (r.type !== "panel") return c;
        const nextPanel = orderedPanels[panelCursor] ?? r;
        panelCursor++;
        return nextPanel;
      });

      return props.safeSchema({
        ...ensured,
        display: "wizard",
        components: nextComponents,
      }) as FormSchema;
    });
  }

  const activeWizardStepId = useMemo(() => {
    if (display !== "wizard") return null;
    if (wizardPanelItems.length === 0) return null;
    const idx = Math.max(0, Math.min(activeWizardPageIndex, wizardPanelItems.length - 1));
    return wizardPanelItems[idx]?.id ?? null;
  }, [activeWizardPageIndex, display, wizardPanelItems]);

  const activeWizardStepName = useMemo(() => {
    if (!activeWizardStepId) return "";
    const item = wizardPanelItems.find((p) => p.id === activeWizardStepId);
    return item?.title ?? activeWizardStepId;
  }, [activeWizardStepId, wizardPanelItems]);

  const commitRenameStep = (nextNameRaw: string) => {
    const nextName = nextNameRaw.trim();
    setRenamingStep(false);
    if (!nextName) {
      setRenameDraft(activeWizardStepName);
      return;
    }

    if (display !== "wizard") return;

    setDraftSchema((prev) => {
      const ensured = ensureWizardHasPage(props.safeSchema(prev));
      const prevComps = Array.isArray(ensured.components) ? ensured.components : [];

      const panels = prevComps
        .map((c) => (c && typeof c === "object" ? (c as Record<string, unknown>) : null))
        .filter((x): x is Record<string, unknown> => x !== null)
        .filter((c) => c.type === "panel" && Array.isArray(c.components));

      const idx =
        activeWizardStepId && panels.length ? panels.findIndex((p) => p.key === activeWizardStepId) : 0;
      const clampedIdx = idx >= 0 ? idx : 0;
      const activePanel = panels[Math.max(0, Math.min(clampedIdx, panels.length - 1))];
      const activeKey = typeof activePanel?.key === "string" ? activePanel.key : null;

      const nextComponents = prevComps.map((c) => {
        if (!activeKey) return c;
        if (!c || typeof c !== "object") return c;
        const r = c as Record<string, unknown>;
        if (r.type !== "panel") return c;
        if (r.key !== activeKey) return c;
        return {
          ...r,
          breadcrumb: nextName,
          title: nextName,
          label: nextName,
        };
      });

      return props.safeSchema({
        ...ensured,
        display: "wizard",
        components: nextComponents,
      }) as FormSchema;
    });
  };

  const canSave = useMemo(() => {
    if (props.mode === "edit" && formId === null) return false;
    return draftName.trim().length > 0;
  }, [draftName, formId, props.mode]);

  const savingLabel = props.mode === "add" ? "Save" : "Save Changes";

  const toggleRole = (role: "admin" | "editor" | "viewer", checked: boolean) => {
    setAllowedRoles((prev) => {
      const has = prev.includes(role);
      if (checked && !has) return [...prev, role];
      if (!checked && has) return prev.filter((r) => r !== role);
      return prev;
    });
  };

  const toggleUser = (userId: number, checked: boolean) => {
    setAllowedUserIds((prev) => {
      const has = prev.includes(userId);
      if (checked && !has) return [...prev, userId];
      if (!checked && has) return prev.filter((id) => id !== userId);
      return prev;
    });
  };

  const handleSave = async () => {
    const name = draftName.trim();
    if (!name) {
      alert("Please enter a form name.");
      return;
    }

    const schemaNormalized = normalizedSchemaForSave(props.safeSchema, name, draftSchema);
    const schemaNormalizedObj =
      schemaNormalized && typeof schemaNormalized === "object" ? (schemaNormalized as Record<string, unknown>) : {};
    const appSettingsRaw = schemaNormalizedObj.appSettings;
    const appSettingsObj = appSettingsRaw && typeof appSettingsRaw === "object" ? (appSettingsRaw as FormAppSettings) : {};
    const showIconDefaulted = appSettingsObj.showIconInFormsList === false ? false : true;
    const hasImage = typeof appSettingsObj.formsListImageDataUrl === "string" && appSettingsObj.formsListImageDataUrl.trim().length > 0;
    const hasIconKey = typeof appSettingsObj.formsListIconKey === "string" && appSettingsObj.formsListIconKey.trim().length > 0;

    const schemaToSave = props.safeSchema({
      ...schemaNormalizedObj,
      appSettings: {
        ...appSettingsObj,
        showIconInFormsList: showIconDefaulted,
        ...(showIconDefaulted && !hasImage && !hasIconKey ? { formsListIconKey: DEFAULT_REACT_ICON_KEY } : {}),
      },
    }) as FormSchema;

    const accessToSave: FormAccessSettings = {
      visibility,
      allowed_roles: visibility === "restricted" ? allowedRoles : [],
      allowed_user_ids: visibility === "restricted" && canAssignUsers ? allowedUserIds : [],
    };

    try {
      if (props.mode === "add") {
        await props.onCreate({ name, schema: schemaToSave, access: accessToSave });
        toast.success("Form added successfully!");
      } else {
        if (formId === null) {
          alert("Invalid form id.");
          return;
        }
        await props.onUpdate(formId, { name, schema: schemaToSave, access: accessToSave });
        toast.success("Form updated successfully!");
      }

      await props.loadForms();
      props.onBack();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg || (props.mode === "add" ? "Failed to create form." : "Failed to update form."));
    }
  };

  const isInvalidEditId = props.mode === "edit" && formId === null;

  const builderSchema = useMemo(() => {
    if (display !== "wizard") return props.safeSchema(draftSchema);

    const ensured = ensureWizardHasPage(props.safeSchema(draftSchema));
    const comps = Array.isArray(ensured.components) ? ensured.components : [];

    const panels = comps
      .map((c) => (c && typeof c === "object" ? (c as Record<string, unknown>) : null))
      .filter((x): x is Record<string, unknown> => x !== null)
      .filter((c) => c.type === "panel" && Array.isArray(c.components));

    const idx = Math.max(0, Math.min(activeWizardPageIndex, panels.length - 1));
    const panel = panels[idx];
    const panelKey = typeof panel?.key === "string" ? panel.key : null;

    if (!panelKey) return ensured;

    return props.safeSchema({
      ...ensured,
      // We edit a single wizard page at a time, so we intentionally provide the
      // builder with a non-wizard schema. If we pass display:"wizard" without
      // panel components, Form.io may auto-wrap / restructure components,
      // causing fields to be saved under the wrong page.
      display: "form",
      components: Array.isArray(panel.components) ? panel.components : [],
    });
  }, [activeWizardPageIndex, display, draftSchema, props]);

  if (isInvalidEditId) {
    return (
      <div className="bg-white p-8 rounded shadow w-full">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Edit Form</h1>
          <Button variant="outline" onClick={props.onBack}>
            Back
          </Button>
        </div>
        <div className="text-red-700">Invalid form id.</div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="bg-white p-8 rounded shadow w-full">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">{props.mode === "add" ? "Add New Form" : "Edit Form"}</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={props.onBack}>
              Back
            </Button>
            <Button onClick={() => void handleSave()} disabled={!canSave}>
              {savingLabel}
            </Button>
          </div>
        </div>

        {props.error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">{props.error}</div>
        )}

        {props.mode === "edit" && props.loading ? (
          <div>Loading…</div>
        ) : props.mode === "edit" && !activeForm ? (
          <div className="text-gray-600">Form not found.</div>
        ) : (
          <>
            <div className="mb-4">
              <Label htmlFor="adminFormName">Form name</Label>
              <Input
                id="adminFormName"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="e.g. Forklift Prestart"
              />
            </div>

            <div className="mb-6">
              <div className="mb-2 text-sm font-semibold text-gray-900">Form access</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Visibility</Label>
                  <Select
                    value={visibility}
                    options={[
                      { value: "public", label: "Public (anyone can see)" },
                      { value: "restricted", label: "Restricted (assigned only)" },
                    ]}
                    onChange={(v) => setVisibility(v === "restricted" ? "restricted" : "public")}
                  />
                </div>

                <div>
                  <Label>Allowed roles</Label>
                  <div className="mt-2 flex flex-col gap-2">
                    <Checkbox
                      label="Viewer"
                      checked={allowedRoles.includes("viewer")}
                      onChange={(checked) => toggleRole("viewer", checked)}
                      disabled={visibility !== "restricted"}
                    />
                    <Checkbox
                      label="Editor"
                      checked={allowedRoles.includes("editor")}
                      onChange={(checked) => toggleRole("editor", checked)}
                      disabled={visibility !== "restricted"}
                    />
                    <Checkbox
                      label="Admin"
                      checked={allowedRoles.includes("admin")}
                      onChange={(checked) => toggleRole("admin", checked)}
                      disabled={visibility !== "restricted"}
                    />
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    If restricted, users can access if their role is checked or they are explicitly assigned.
                  </div>
                </div>
              </div>

              {visibility === "restricted" ? (
                <div className="mt-4">
                  <Label>Specific users (admin only)</Label>
                  {!canAssignUsers ? (
                    <div className="mt-2 text-sm text-gray-500">Only admins can assign specific users.</div>
                  ) : (
                    <>
                      <Input
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Search users by email…"
                      />
                      <div className="mt-2 max-h-48 overflow-auto rounded-lg border border-gray-200 p-3">
                        {usersLoading ? (
                          <div className="text-sm text-gray-600">Loading users…</div>
                        ) : (
                          (users
                            .filter((u) => {
                              const q = userSearch.trim().toLowerCase();
                              if (!q) return true;
                              return String(u.email).toLowerCase().includes(q);
                            })
                            .slice(0, 200)
                          ).map((u) => (
                            <div key={u.id} className="py-1">
                              <Checkbox
                                label={`${u.email} (${u.role})`}
                                checked={allowedUserIds.includes(u.id)}
                                onChange={(checked) => toggleUser(u.id, checked)}
                              />
                            </div>
                          ))
                        )}
                        {!usersLoading && users.length === 0 ? (
                          <div className="text-sm text-gray-600">No users found.</div>
                        ) : null}
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </div>

            <div className="mb-4">
              <Label htmlFor="adminFormPublicDescription">Form description</Label>
              <TextArea
                rows={3}
                value={typeof appSettings.publicDescription === "string" ? appSettings.publicDescription : ""}
                onChange={(value) => {
                  setAppSettings((prevSettings) => ({
                    ...prevSettings,
                    publicDescription: value,
                  }));
                }}
                placeholder="Shown to users on the public Forms page"
              />
            </div>

            <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
              <div className="mb-3 text-sm font-semibold text-gray-900">Form settings</div>

              <div className="flex items-start justify-between gap-4 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-gray-900">Show preview before submission</div>
                    <div className="relative group">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 group-hover:text-gray-700">
                        i
                      </span>
                      <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 hidden w-72 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700 shadow-(--shadow-tooltip) group-hover:block">
                        Shows a review screen with all answers before the final submit.
                      </div>
                    </div>
                  </div>
                </div>

                <Switch
                  label=""
                  checked={!!appSettings.previewBeforeSubmit}
                  onChange={(checked) => {
                    setAppSettings((prevSettings) => ({
                      ...prevSettings,
                      previewBeforeSubmit: checked,
                      // If preview is disabled, draft PDF before submit doesn't make sense.
                      ...(checked ? {} : { allowDraftPdfBeforeSubmit: false }),
                    }));
                  }}
                />
              </div>

              <div className="h-px bg-gray-100" />

              <div className="flex items-start justify-between gap-4 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-gray-900">Allow export as draft (PDF) before submission</div>
                    <div className="relative group">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 group-hover:text-gray-700">
                        i
                      </span>
                      <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 hidden w-72 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700 shadow-(--shadow-tooltip) group-hover:block">
                        When preview is enabled, users can download a PDF of their answers.
                      </div>
                    </div>
                  </div>
                </div>

                <Switch
                  label=""
                  checked={!!appSettings.allowDraftPdfBeforeSubmit}
                  disabled={!appSettings.previewBeforeSubmit}
                  color="gray"
                  onChange={(checked) => {
                    setAppSettings((prevSettings) => ({
                      ...prevSettings,
                      allowDraftPdfBeforeSubmit: checked,
                    }));
                  }}
                />
              </div>

              <div className="h-px bg-gray-100" />

              <div className="flex items-start justify-between gap-4 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-gray-900">Show icon in forms list</div>
                    <div className="relative group">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 group-hover:text-gray-700">
                        i
                      </span>
                      <div className="pointer-events-none absolute left-0 top-full z-50 mt-2 hidden w-72 rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700 shadow-(--shadow-tooltip) group-hover:block">
                        Shows an icon (or image) on the public Forms page.
                      </div>
                    </div>
                  </div>
                </div>

                <Switch
                  label=""
                  checked={appSettings.showIconInFormsList !== false}
                  onChange={(checked) => {
                    setAppSettings((prevSettings) => ({
                      ...prevSettings,
                      showIconInFormsList: checked,
                      // Initialize a sensible default icon.
                      ...(checked && !prevSettings.formsListIconKey ? { formsListIconKey: DEFAULT_REACT_ICON_KEY } : {}),
                    }));
                  }}
                />
              </div>

              {appSettings.showIconInFormsList !== false && (
                <div className="mt-2 rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="shrink-0">{getFormListIconNode(appSettings)}</div>

                    <div className="min-w-0 flex-1">
                      <Label className="text-xs">Icon</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIconPickerOpen(true)}
                          className="shrink-0"
                        >
                          Choose icon
                        </Button>
                        {typeof appSettings.formsListIconKey === "string" && appSettings.formsListIconKey ? (
                          <span className="text-xs text-gray-500">{appSettings.formsListIconKey}</span>
                        ) : (
                          <span className="text-xs text-gray-500">Default</span>
                        )}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <Label className="text-xs">Image (optional)</Label>
                      <div className="flex items-center gap-2">
                        <input
                          id="adminFormImageUpload"
                          type="file"
                          accept="image/*"
                          className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border file:border-gray-200 file:bg-white file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-50"
                          onChange={(e) => {
                            const file = e.target.files && e.target.files[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              const result = typeof reader.result === "string" ? reader.result : "";
                              if (!result) return;
                              setAppSettings((prevSettings) => ({
                                ...prevSettings,
                                formsListImageDataUrl: result,
                              }));
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                        {typeof appSettings.formsListImageDataUrl === "string" && appSettings.formsListImageDataUrl ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            onClick={() => {
                              setAppSettings((prevSettings) => ({
                                ...prevSettings,
                                formsListImageDataUrl: "",
                              }));
                            }}
                          >
                            Clear
                          </Button>
                        ) : null}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">If an image is uploaded, it will be used instead of the icon.</div>
                    </div>
                  </div>
                </div>
              )}

              {iconPickerOpen ? (
                <IconPickerModal
                  isOpen={true}
                  onClose={() => setIconPickerOpen(false)}
                  onSelect={(icon) => {
                    setAppSettings((prevSettings) => ({
                      ...prevSettings,
                      formsListIconKey: toIconKey(icon),
                    }));
                    setIconPickerOpen(false);
                  }}
                />
              ) : null}
            </div>

            <div className="mb-4">
              <Label>Form layout</Label>
              <Select
                value={display}
                disabled={props.mode === "edit"}
                onChange={(value) => {
                  const nextDisplay = (value === "wizard" ? "wizard" : "form") as FormDisplay;
                  setDraftSchema((prev) => {
                    const next = { ...prev, display: nextDisplay } as FormSchema;
                    return nextDisplay === "wizard" ? ensureWizardHasPage(next) : next;
                  });
                  setActiveWizardPageKey(null);
                }}
                options={[
                  { value: "form", label: "Single page" },
                  { value: "wizard", label: "Multi-step (wizard)" },
                ]}
                className={props.mode === "edit" ? "opacity-60" : ""}
              />
              <div className="mt-1 text-xs text-gray-500">
                {props.mode === "edit"
                  ? "Form layout is locked after creation. Create a new form to change layout."
                  : "Tip: In wizard mode, add more \"Panel\" components to create additional steps."}
              </div>
            </div>

            {display === "wizard" && <div className="mb-4" />}

            <div className="mt-6">
              {display === "wizard" && wizardPanelItems.length > 0 && (
                <div className="mb-3 rounded-lg border border-gray-200 bg-white">
                  <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-3 py-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                        <span>Step</span>
                        <span
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-white text-[11px] leading-none text-gray-600"
                          title="These pages become the steps users can navigate. Drag to reorder. Double-click the step name to rename."
                          aria-label="Step help"
                        >
                          i
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-gray-900">
                        {renamingStep ? (
                          <input
                            className="mt-1 w-full max-w-md rounded border border-gray-300 px-2 py-1 text-sm"
                            value={renameDraft}
                            autoFocus
                            onChange={(e) => setRenameDraft(e.target.value)}
                            onBlur={() => commitRenameStep(renameDraft)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitRenameStep(renameDraft);
                              if (e.key === "Escape") {
                                setRenamingStep(false);
                                setRenameDraft(activeWizardStepName);
                              }
                            }}
                          />
                        ) : (
                          <button
                            type="button"
                            className="text-left hover:underline"
                            onDoubleClick={() => {
                              setRenameDraft(activeWizardStepName);
                              setRenamingStep(true);
                            }}
                          >
                            {activeWizardStepName}
                          </button>
                        )}
                      </div>
                    </div>

                    <Button
                      size="xsm"
                      onClick={() => {
                        setDraftSchema((prev) => {
                          const next = ensureWizardHasPage({ ...prev, display: "wizard" } as FormSchema);
                          const comps = Array.isArray(next.components) ? [...next.components] : [];

                          const existingPanels = comps.filter(
                            (c) =>
                              !!c &&
                              typeof c === "object" &&
                              (c as Record<string, unknown>).type === "panel" &&
                              Array.isArray((c as Record<string, unknown>).components)
                          );
                          const pageNum = existingPanels.length + 1;
                          const key = `page${pageNum}`;
                          comps.push({
                            type: "panel",
                            breadcrumb: `Page ${pageNum}`,
                            title: `Page ${pageNum}`,
                            label: `Page ${pageNum}`,
                            key,
                            components: [],
                          });

                          setActiveWizardPageKey(key);
                          return { ...next, components: comps } as FormSchema;
                        });
                      }}
                    >
                      + Add Page
                    </Button>
                  </div>

                  <div className="px-3 py-2">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleReorderPages}>
                      <SortableContext items={wizardPanelItems.map((p) => p.id)} strategy={horizontalListSortingStrategy}>
                        <div className="flex flex-wrap items-center gap-2">
                          {wizardPanelItems.map((p) => {
                            const active = (activeWizardStepId ?? wizardPanelItems[0]?.id ?? null) === p.id;
                            return (
                              <WizardStepPill
                                key={p.id}
                                id={p.id}
                                title={p.title}
                                active={active}
                                onSelect={() => setActiveWizardPageKey(p.id)}
                                onDelete={() => {
                                  if (display !== "wizard") return;
                                  if (wizardPanelItems.length <= 1) {
                                    toast.error("You must have at least one page.");
                                    return;
                                  }

                                  const ok = window.confirm(`Delete page "${p.title}"? This cannot be undone.`);
                                  if (!ok) return;

                                  setDraftSchema((prev) => {
                                    const ensured = ensureWizardHasPage(props.safeSchema(prev));
                                    const prevComps = Array.isArray(ensured.components) ? ensured.components : [];

                                    const panels = prevComps
                                      .map((c) => (c && typeof c === "object" ? (c as Record<string, unknown>) : null))
                                      .filter((x): x is Record<string, unknown> => x !== null)
                                      .filter((c) => c.type === "panel" && Array.isArray(c.components));

                                    const ids = panels.map((panel, idx) =>
                                      typeof panel.key === "string" && panel.key.trim() ? panel.key : `page${idx + 1}`
                                    );
                                    const deleteIdx = ids.indexOf(p.id);
                                    if (deleteIdx < 0) return ensured;

                                    if (ids.length <= 1) return ensured;

                                    const nextActiveId =
                                      (activeWizardStepId === p.id
                                        ? ids[deleteIdx + 1] ?? ids[deleteIdx - 1] ?? null
                                        : activeWizardStepId) ?? null;

                                    let panelCursor = 0;
                                    const nextComponents = prevComps.filter((c) => {
                                      if (!c || typeof c !== "object") return true;
                                      const r = c as Record<string, unknown>;
                                      if (r.type !== "panel") return true;
                                      const currentId = ids[panelCursor] ?? "";
                                      panelCursor++;
                                      return currentId !== p.id;
                                    });

                                    setActiveWizardPageKey(nextActiveId);
                                    return props.safeSchema({
                                      ...ensured,
                                      display: "wizard",
                                      components: nextComponents,
                                    }) as FormSchema;
                                  });
                                }}
                              />
                            );
                          })}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                </div>
              )}

              <div className="mb-3 flex items-center justify-end gap-2">
                <Button size="xsm" variant="outline" onClick={() => setPaletteCollapsed((v) => !v)}>
                  {paletteCollapsed ? "Show Components" : "Hide Components"}
                </Button>
                <Button size="xsm" variant="outline" onClick={() => setPreviewOpen((v) => !v)}>
                  {previewOpen ? "Hide Preview" : "Show Preview"}
                </Button>
              </div>

              <div className="flex flex-nowrap items-start gap-4 overflow-x-auto">
                <div
                  className={
                    paletteCollapsed
                      ? "flex-1 min-w-0 formio-builder-shell palette-collapsed"
                      : "flex-1 min-w-0 formio-builder-shell"
                  }
                >
                  <FormioBuilder
                    form={builderSchema}
                    onChange={(schema) => {
                      const next = props.safeSchema(schema) as FormSchema;

                      setDraftSchema((prev) => {
                        const prevObj = prev && typeof prev === "object" ? (prev as Record<string, unknown>) : {};
                        const prevSettings =
                          prevObj.appSettings && typeof prevObj.appSettings === "object" ? prevObj.appSettings : undefined;

                        const currentDisplay = getDisplay(props.safeSchema(prev));
                        if (currentDisplay !== "wizard") {
                          // Preserve appSettings that the Form.io builder won't keep.
                          return props.safeSchema({
                            ...next,
                            ...(prevSettings ? { appSettings: prevSettings } : {}),
                          });
                        }

                        const updatedPage = next;
                        const ensured = ensureWizardHasPage(props.safeSchema(prev));
                        const prevComps = Array.isArray(ensured.components) ? ensured.components : [];

                        const panels = prevComps
                          .map((c) => (c && typeof c === "object" ? (c as Record<string, unknown>) : null))
                          .filter((x): x is Record<string, unknown> => x !== null)
                          .filter((c) => c.type === "panel" && Array.isArray(c.components));

                        const idx =
                          activeWizardPageKey && panels.length
                            ? panels.findIndex((p) => p.key === activeWizardPageKey)
                            : 0;
                        const clampedIdx = idx >= 0 ? idx : 0;
                        const activePanel = panels[Math.max(0, Math.min(clampedIdx, panels.length - 1))];
                        const activeKey = typeof activePanel?.key === "string" ? activePanel.key : null;

                        const nextComponents = prevComps.map((c) => {
                          if (!activeKey) return c;
                          if (!c || typeof c !== "object") return c;
                          const r = c as Record<string, unknown>;
                          if (r.type !== "panel") return c;
                          if (r.key !== activeKey) return c;
                          return { ...r, components: updatedPage.components };
                        });

                        return props.safeSchema({
                          ...ensured,
                          display: "wizard",
                          components: nextComponents,
                          ...(prevSettings ? { appSettings: prevSettings } : {}),
                        }) as FormSchema;
                      });
                    }}
                  />
                </div>

                {previewOpen && (
                  <div className="w-96 shrink-0 rounded border border-gray-200 bg-white p-4">
                    <div className="text-sm font-medium text-gray-900 mb-3">Preview</div>
                    <SmartFormRenderer
                      form={props.safeSchema(draftSchema)}
                      onSubmit={() => {
                        toast.success("Preview submitted (not saved)");
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex gap-2 justify-end">
              <button
                className="px-4 py-2 bg-gray-300 rounded"
                onClick={() => {
                  setDraftName("");
                  setDraftSchema(props.EMPTY_FORM);
                  setActiveWizardPageKey(null);
                  setInitializedFor(null);
                }}
              >
                Clear
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
