import { useCallback, useEffect, useState } from "react";
import { getForms } from "../../../services/formService";

type FormSchema = {
  components: unknown[];
} & Record<string, unknown>;

export type FormSummary = {
  id: number;
  name: string;
  schema: FormSchema;
};

export const EMPTY_FORM: FormSchema = {
  type: "form",
  display: "form",
  title: "Untitled Form",
  name: "untitled",
  path: "untitled",
  components: [],
};

export function safeSchema(schema: unknown): FormSchema {
  if (schema && typeof schema === "object") {
    const maybe = schema as Record<string, unknown>;
    if (Array.isArray(maybe.components)) return schema as FormSchema;
  }
  return EMPTY_FORM;
}

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function useForms() {
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadForms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await getForms()) as Array<{ id: number; name: string; json: unknown }>;
      const mapped = data.map((f) => {
        const parsed = parseMaybeJson(f.json);
        return {
          id: f.id,
          name: f.name,
          schema: safeSchema(parsed ?? f.json),
        };
      });
      setForms(mapped);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load forms");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  return { forms, setForms, loading, error, loadForms, EMPTY_FORM, safeSchema };
}
