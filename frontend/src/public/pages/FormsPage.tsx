import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getForms } from "../../shared/services/formService";
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
  const navigate = useNavigate();
  const [forms, setForms] = useState<FormListItem[]>([]);

  useEffect(() => {
    (async () => {
      const data: unknown = await getForms({ mode: "public" });
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

  // Otherwise show paginated cards.
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-gray-600">{cards.length} total</div>
      </div>

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
                navigate(`/forms/${c.id}/fill`);
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
