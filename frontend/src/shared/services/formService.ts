import { apiFetch } from "./apiClient";

export type FormVisibility = "public" | "restricted";
export type FormAccessSettings = {
  visibility: FormVisibility;
  allowed_roles?: Array<"admin" | "editor" | "viewer">;
  allowed_user_ids?: number[];
};

export async function createForm(form: { name: string; schema: unknown; access?: FormAccessSettings }) {
  const res = await apiFetch("/api/forms", {
    method: "POST",
    body: JSON.stringify({
      name: form.name,
      json: form.schema,
      ...(form.access
        ? {
            visibility: form.access.visibility,
            allowed_roles: form.access.allowed_roles ?? [],
            allowed_user_ids: form.access.allowed_user_ids ?? [],
          }
        : {}),
    }),
  });
  return res.json();
}

export async function updateForm(id: number, form: { name: string; schema: unknown; access?: FormAccessSettings }) {
  const res = await apiFetch(`/api/forms/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      name: form.name,
      json: form.schema,
      ...(form.access
        ? {
            visibility: form.access.visibility,
            allowed_roles: form.access.allowed_roles ?? [],
            allowed_user_ids: form.access.allowed_user_ids ?? [],
          }
        : {}),
    }),
  });
  return res.json();
}
export async function deleteForm(id: number) {
  const res = await apiFetch(`/api/forms/${id}`, {
    method: "DELETE",
  });
  return res.json();
}
export async function submitForm(formId: number, data: unknown) {
  const res = await apiFetch(`/api/forms/${formId}/submit`, {
    method: "POST",
    body: JSON.stringify({ data }),
  });
  return res.json();
}

export type FormsFetchMode = "admin" | "public";

export async function getForms(options?: { mode?: FormsFetchMode }) {
  const mode = options?.mode;
  const url = mode === "public" ? "/api/forms?mode=public" : "/api/forms";
  const res = await apiFetch(url);
  return res.json();
}

export async function getFormById(id: number, options?: { mode?: FormsFetchMode }) {
  const mode = options?.mode;
  const url = mode === "public" ? `/api/forms/${id}?mode=public` : `/api/forms/${id}`;
  const res = await apiFetch(url);
  return res.json();
}
