import { useEffect, useMemo, useState } from "react";
import { getForms, getFormById, submitForm } from "../../shared/services/formService";
import type { FormJson } from "../../shared/types/form";
import SmartFormRenderer from "../../shared/components/formio/SmartFormRenderer";
import {
  FaRegFileAlt,
  FaClipboardList,
  FaTasks,
  FaUser,
  FaBell,
  FaWrench,
  FaExclamationTriangle,
} from "react-icons/fa";
import { ReactIconFromKey } from "../../shared/components/ui/ReactIconFromKey";
import { parseIconKey } from "../../shared/components/ui/reactIconsRegistry";

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

type FormListItem = {
  id: number;
  name: string;
  json?: unknown;
};

type FormListIconSettings = {
  show?: boolean;
  iconKey?: string;
  imageDataUrl?: string;
};

type FormPublicMeta = {
  description?: string;
};

const FORM_LIST_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  file: FaRegFileAlt,
  clipboard: FaClipboardList,
  tasks: FaTasks,
  user: FaUser,
  bell: FaBell,
  wrench: FaWrench,
  warning: FaExclamationTriangle,
};

function getIconSettings(schema: unknown): FormListIconSettings {
  const obj = schema && typeof schema === "object" ? (schema as Record<string, unknown>) : null;
  const appSettings = obj && typeof obj.appSettings === "object" && obj.appSettings ? (obj.appSettings as Record<string, unknown>) : null;
  return {
    show: appSettings?.showIconInFormsList === false ? false : true,
    iconKey: typeof appSettings?.formsListIconKey === "string" ? (appSettings.formsListIconKey as string) : undefined,
    imageDataUrl:
      typeof appSettings?.formsListImageDataUrl === "string" ? (appSettings.formsListImageDataUrl as string) : undefined,
  };
}

function getPublicMeta(schema: unknown): FormPublicMeta {
  const obj = schema && typeof schema === "object" ? (schema as Record<string, unknown>) : null;
  const appSettings = obj && typeof obj.appSettings === "object" && obj.appSettings ? (obj.appSettings as Record<string, unknown>) : null;
  const description = typeof appSettings?.publicDescription === "string" ? (appSettings.publicDescription as string) : "";
  return { description: description.trim() ? description.trim() : undefined };
}

function FormCardIcon({ settings }: { settings: FormListIconSettings }) {
  if (!settings.show) return null;

  if (settings.imageDataUrl) {
    return (
      <img
        src={settings.imageDataUrl}
        alt="Form image"
        className="w-full h-40 rounded-xl mb-6 object-cover"
      />
    );
  }

  const parsed = parseIconKey(settings.iconKey);
  if (parsed) {
    return (
      <div className="w-full h-40 rounded-xl mb-6 bg-gray-50 text-gray-700 flex items-center justify-center">
        <ReactIconFromKey iconKey={settings.iconKey} fallback={FaRegFileAlt} className="h-10 w-10" />
      </div>
    );
  }

  const Icon = FORM_LIST_ICON_MAP[settings.iconKey || ""] ?? FaRegFileAlt;
  return (
    <div className="w-full h-40 rounded-xl mb-6 bg-gray-50 text-gray-700 flex items-center justify-center">
      <Icon className="h-10 w-10" />
    </div>
  );
}

function countQuestions(schema: unknown): number {
  const obj = schema && typeof schema === "object" ? (schema as Record<string, unknown>) : null;
  const rawComps = obj && Array.isArray(obj.components) ? obj.components : [];
  const comps = rawComps.filter((c): c is Record<string, unknown> => !!c && typeof c === "object");
  // Simple heuristic: count non-button components
  return comps.filter((c) => c.type !== "button").length;
}

export default function FormsPage() {
  const [forms, setForms] = useState<FormListItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedForm, setSelectedForm] = useState<FormJson | null>(null);
  const [selectedFormName, setSelectedFormName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const data: unknown = await getForms();
      if (!Array.isArray(data)) {
        setForms([]);
        return;
      }
      const mapped: FormListItem[] = data
        .map((row): FormListItem | null => {
          if (!row || typeof row !== "object") return null;
          const r = row as Record<string, unknown>;
          if (typeof r.id !== "number" || typeof r.name !== "string") return null;
          return { id: r.id, name: r.name, json: r.json };
        })
        .filter((x): x is FormListItem => x !== null);
      setForms(mapped);
    })();
  }, []);

  const cards = useMemo(() => {
    return forms.map((f) => {
      const parsed = parseMaybeJson(f.json);
      const q = countQuestions(parsed ?? f.json);
      const icon = getIconSettings(parsed ?? f.json);
		const meta = getPublicMeta(parsed ?? f.json);
      return { id: f.id, name: f.name, questions: q, icon, meta };
    });
  }, [forms]);

  const handleSubmit = async (data: Record<string, unknown>) => {
    if (!selectedId) return;
    setSubmitStatus(null);
    try {
      await submitForm(selectedId, data);
      setSubmitStatus("Form submitted successfully!");
      // Reset form after submission
      setSelectedForm(null);
      setSelectedId(null);
      setSelectedFormName(null);
    } catch {
      setSubmitStatus("Submission failed. Please try again.");
    }
  };

  const startForm = async (id: number, name?: string) => {
    setLoading(true);
    setSubmitStatus(null);
    try {
      const data: unknown = await getFormById(id);
      if (!data || typeof data !== "object") throw new Error("Invalid form response");
      const json = (data as Record<string, unknown>).json;
      if (!json || typeof json !== "object") throw new Error("Invalid form schema");
      setSelectedId(id);
      setSelectedForm(json as FormJson);
      setSelectedFormName(typeof name === "string" && name.trim() ? name : null);
    } catch {
      setSelectedId(null);
      setSelectedForm(null);
      setSelectedFormName(null);
      setSubmitStatus("Failed to load form. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // If a form is selected, show the fill experience.
  if (selectedForm) {
    const formTitle = (selectedForm.title || selectedForm.name || selectedFormName || "Fill Form").trim();
	const publicDescription = getPublicMeta(selectedForm).description;
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
			<div className="min-w-0">
				<h1 className="text-2xl font-bold">{formTitle}</h1>
				{publicDescription ? <div className="mt-1 text-sm text-gray-600">{publicDescription}</div> : null}
			</div>
          <button
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={() => {
              setSelectedForm(null);
              setSelectedId(null);
              setSelectedFormName(null);
              setSubmitStatus(null);
            }}
          >
            Back to Forms
          </button>
        </div>

        {loading && <div>Loading form...</div>}
        {!loading && <SmartFormRenderer form={selectedForm} onSubmit={handleSubmit} />}

        {submitStatus && (
          <div className="mt-4 p-2 bg-green-100 text-green-800 rounded">{submitStatus}</div>
        )}
      </div>
    );
  }

  // Otherwise show paginated cards.
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-gray-600">{cards.length} total</div>
      </div>

      {submitStatus && (
        <div className="mb-4 p-2 bg-red-100 text-red-800 rounded">{submitStatus}</div>
      )}

      {cards.length === 0 ? (
        <div className="text-gray-500">No forms available.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((c) => (
			  <div key={c.id} className="w-full max-w-sm bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
				<FormCardIcon settings={c.icon} />

				<div>
					<div className="flex items-center gap-3 mb-4">
						<span className="inline-flex items-center rounded-md border border-brand-100 bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">
							{c.questions} questions
						</span>
					</div>

					<div className="text-xl text-gray-900 font-semibold tracking-tight wrap-break-word">{c.name}</div>
          {c.meta?.description ? (
            <div className="mt-2 text-sm text-gray-600 overflow-hidden">
              {c.meta.description}
            </div>
          ) : null}

					<div className="flex items-center justify-between mt-6">
						<span className="text-sm font-medium text-gray-600">&nbsp;</span>
						<button
							type="button"
							className="inline-flex items-center text-white bg-brand-500 hover:bg-brand-600 shadow-theme-xs font-medium rounded-lg text-sm px-3 py-2"
							onClick={() => {
								void startForm(c.id, c.name);
							}}
						>
							Start Form
						</button>
					</div>
				</div>
			  </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
