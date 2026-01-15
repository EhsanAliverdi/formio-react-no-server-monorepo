import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";

import SmartFormRenderer from "../../shared/components/formio/SmartFormRenderer";
import { getFormById, submitForm } from "../../shared/services/formService";
import type { FormJson } from "../../shared/types/form";

function getPublicMeta(schema: unknown): { description?: string } {
  const obj = schema && typeof schema === "object" ? (schema as Record<string, unknown>) : null;
  const appSettings =
    obj && typeof obj.appSettings === "object" && obj.appSettings
      ? (obj.appSettings as Record<string, unknown>)
      : null;
  const description = typeof appSettings?.publicDescription === "string" ? (appSettings.publicDescription as string) : "";
  return { description: description.trim() ? description.trim() : undefined };
}

export default function FillFormPage() {
  const navigate = useNavigate();
  const params = useParams();

  const formId = Number(params.id);

  const [form, setForm] = useState<FormJson | null>(null);
  const [formName, setFormName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!Number.isFinite(formId) || formId <= 0) {
      toast.error("Invalid form");
      navigate("/forms", { replace: true });
      return;
    }

    setLoading(true);
    (async () => {
      try {
        const data: unknown = await getFormById(formId, { mode: "public" });
        if (!data || typeof data !== "object") throw new Error("Invalid form response");
        const json = (data as Record<string, unknown>).json;
        const name = (data as Record<string, unknown>).name;
        if (!json || typeof json !== "object") throw new Error("Invalid form schema");

        setForm(json as FormJson);
        setFormName(typeof name === "string" && name.trim() ? name.trim() : null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load form";
        toast.error(msg);
        setForm(null);
        setFormName(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [formId, navigate]);

  const formTitle = useMemo(() => {
    if (!form) return "Fill Form";
    return (form.title || form.name || formName || "Fill Form").trim();
  }, [form, formName]);

  const publicDescription = useMemo(() => {
    return form ? getPublicMeta(form).description : undefined;
  }, [form]);

  const handleSubmit = async (data: Record<string, unknown>) => {
    if (!Number.isFinite(formId) || formId <= 0) return;
    try {
      await submitForm(formId, data);
      toast.success("Form submitted successfully!");
      // Reset renderer to clear fields.
      setReloadKey((k) => k + 1);
      navigate("/forms/mysubmissions");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed. Please try again.");
    }
  };

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
            navigate("/forms");
          }}
        >
          Back to Forms
        </button>
      </div>

      {loading ? <div>Loading form...</div> : null}
      {!loading && form ? <SmartFormRenderer key={reloadKey} form={form} onSubmit={handleSubmit} /> : null}

      {!loading && !form ? (
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-gray-700">
          This form is not available.
        </div>
      ) : null}
    </div>
  );
}
