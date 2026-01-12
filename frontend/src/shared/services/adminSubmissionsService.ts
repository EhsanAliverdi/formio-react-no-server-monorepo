import { apiFetch } from "./apiClient";

export type AdminSubmissionRow = {
  id: number;
  form_id: number;
  form_name: string;
  user_id: number | null;
  user_email: string | null;
  submitted_at: string;
  has_abnormalities?: boolean;
  abnormal_count?: number;
};

export type AdminSubmissionDetail = {
  id: number;
  form_id: number;
  form_name: string;
  user_id: number | null;
  user_email: string | null;
  submitted_at: string;
	updated_at?: string | null;
	updated_by?: number | null;
	updated_by_email?: string | null;
	edit_history?: unknown;
  form: unknown;
  data: unknown;
  has_abnormalities?: boolean;
  abnormalities?: Array<{ key: string; label?: string; normalValue: unknown }>;
};

export type AdminSubmissionsListResponse = {
  items: AdminSubmissionRow[];
  total: number;
  limit: number;
  offset: number;
};

export async function listAdminSubmissions(params?: {
  limit?: number;
  offset?: number;
  formId?: number;
  q?: string;
  from?: string;
  to?: string;
}): Promise<AdminSubmissionsListResponse> {
  const sp = new URLSearchParams();
  if (typeof params?.limit === "number" && Number.isFinite(params.limit)) {
    sp.set("limit", String(params.limit));
  }
  if (typeof params?.offset === "number" && Number.isFinite(params.offset)) {
    sp.set("offset", String(params.offset));
  }
  if (typeof params?.formId === "number" && Number.isFinite(params.formId)) {
    sp.set("form_id", String(params.formId));
  }
  if (typeof params?.q === "string" && params.q.trim()) {
    sp.set("q", params.q.trim());
  }
  if (typeof params?.from === "string" && params.from.trim()) {
    sp.set("from", params.from.trim());
  }
  if (typeof params?.to === "string" && params.to.trim()) {
    sp.set("to", params.to.trim());
  }

  const qs = sp.toString();
  const res = await apiFetch(`/api/admin/submissions${qs ? `?${qs}` : ""}`);
	return res.json();
}

export async function getAdminSubmission(id: number): Promise<AdminSubmissionDetail> {
  const res = await apiFetch(`/api/admin/submissions/${id}`);
  return res.json();
}

export async function updateAdminSubmission(id: number, data: unknown): Promise<AdminSubmissionDetail> {
  const res = await apiFetch(`/api/admin/submissions/${id}`, {
    method: "PUT",
    body: JSON.stringify({ data }),
  });
  return res.json();
}
