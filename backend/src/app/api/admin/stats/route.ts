import { corsHeaders, jsonResponse, requireAdmin } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.res;

  const db = await getDb();

  const totalFormsRow = await db.get<{ c: number }>("SELECT COUNT(*) as c FROM forms");
  const totalSubmissionsRow = await db.get<{ c: number }>("SELECT COUNT(*) as c FROM form_submissions");
  const submittedFormsRow = await db.get<{ c: number }>(
      "SELECT COUNT(DISTINCT form_id) as c FROM form_submissions"
  );
    const submissionsTodayRow = await db.get<{ c: number }>(
      "SELECT COUNT(*) as c FROM form_submissions WHERE submitted_at::date = CURRENT_DATE"
  );
    const submissionsLast7DaysRow = await db.get<{ c: number }>(
      "SELECT COUNT(*) as c FROM form_submissions WHERE submitted_at >= NOW() - INTERVAL '7 days'"
  );

  return jsonResponse({
    totalForms: Number(totalFormsRow?.c ?? 0),
    totalSubmissions: Number(totalSubmissionsRow?.c ?? 0),
    submittedForms: Number(submittedFormsRow?.c ?? 0),
    submissionsToday: Number(submissionsTodayRow?.c ?? 0),
    submissionsLast7Days: Number(submissionsLast7DaysRow?.c ?? 0),
  });
}
