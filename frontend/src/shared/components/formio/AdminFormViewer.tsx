import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import SmartFormRenderer from "./SmartFormRenderer";
import Button from "../../../template/tailAdmin/components/ui/button/Button";

type AnyRecord = Record<string, unknown>;

type LoadedForm = {
  id?: number;
  name?: string;
  schema: unknown;
};

function toLoadedForm(payload: unknown): LoadedForm | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as AnyRecord;

  // Backend shape: { id, name, json }
  if ("json" in obj) {
    const schema = obj.json;
    return {
      id: typeof obj.id === "number" ? obj.id : undefined,
      name: typeof obj.name === "string" ? obj.name : undefined,
      schema,
    };
  }

  // Alternate shapes: { schema, name }
  if ("schema" in obj) {
    return {
      id: typeof obj.id === "number" ? obj.id : undefined,
      name: typeof obj.name === "string" ? obj.name : undefined,
      schema: obj.schema,
    };
  }

  // Treat whole object as schema
  return { schema: payload };
}

export type AdminFormViewerProps = {
  formId: number | null;
  backTo: string;
  title?: string;
  loadFormById: (id: number) => Promise<unknown>;
};

export default function AdminFormViewer({ formId, backTo, title = "View Form", loadFormById }: AdminFormViewerProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<LoadedForm | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (formId === null) {
        setPayload(null);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const raw = await loadFormById(formId);
        if (cancelled) return;
        const mapped = toLoadedForm(raw);
        setPayload(mapped);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load form.");
        setPayload(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [formId, loadFormById]);

  const schema = useMemo(() => payload?.schema ?? null, [payload]);

  if (formId === null) {
    return (
      <div className="bg-white p-8 rounded shadow w-full">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">{title}</h1>
          <Button variant="outline" onClick={() => navigate(backTo)}>
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
          <h1 className="text-2xl font-bold">{title}</h1>
          <Button variant="outline" onClick={() => navigate(backTo)}>
            Back
          </Button>
        </div>

        {error && <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}

        {loading ? (
          <div>Loading…</div>
        ) : !schema ? (
          <div className="text-gray-600">Form not found.</div>
        ) : (
          <SmartFormRenderer form={schema} />
        )}
      </div>
    </div>
  );
}
