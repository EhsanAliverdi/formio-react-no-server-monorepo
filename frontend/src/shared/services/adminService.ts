import { apiFetch } from "./apiClient";

export type AdminStats = {
  totalForms: number;
  totalSubmissions: number;
  submittedForms: number;
  submissionsToday: number;
  submissionsLast7Days: number;
};

export async function getAdminStats(): Promise<AdminStats> {
  const res = await apiFetch("/api/admin/stats");
  return res.json();
}
