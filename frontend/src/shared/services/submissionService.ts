import { apiFetch } from "./apiClient";

export type MySubmissionListItem = {
  id: number;
  form_id: number;
  form_name: string;
  submitted_at: string;
  can_export_pdf: boolean;
};

export type MySubmissionDetail = {
  id: number;
  form_id: number;
  form_name: string;
  user_id: number;
  user_email: string;
  submitted_at: string;
  updated_at: string | null;
  form: unknown;
  data: unknown;
  can_export_pdf: boolean;
};

export async function getMySubmissions(): Promise<{ items: MySubmissionListItem[] }> {
  const res = await apiFetch("/api/submissions/me");
  return res.json();
}

export async function getMySubmissionById(id: number): Promise<MySubmissionDetail> {
  const res = await apiFetch(`/api/submissions/${id}`);
  return res.json();
}

export async function exportMySubmissionPdf(id: number, payload: { html: string; fileName: string }): Promise<Blob> {
  const res = await apiFetch(`/api/submissions/${id}/pdf`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/pdf",
    },
  });

  return res.blob();
}
