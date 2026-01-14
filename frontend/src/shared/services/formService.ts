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
// src/services/formService.ts
export async function getForms() {
  const res = await apiFetch("/api/forms");
  return res.json();
}

export async function getFormById(id: number) {
  const res = await apiFetch(`/api/forms/${id}`);
  return res.json();
}
