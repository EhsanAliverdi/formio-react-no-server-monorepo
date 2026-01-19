import { corsHeaders, jsonResponse, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const [totalForms, totalSubmissions] = await Promise.all([
    prisma.form.count(),
    prisma.formSubmission.count(),
  ]);

  // Count distinct forms that have submissions.
  const distinctForms = await prisma.formSubmission.findMany({
    select: { formId: true },
    distinct: ["formId"],
  });
  const submittedForms = distinctForms.length;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [submissionsToday, submissionsLast7Days] = await Promise.all([
    prisma.formSubmission.count({
      where: {
        submittedAt: {
          gte: startOfToday,
          lt: startOfTomorrow,
        },
      },
    }),
    prisma.formSubmission.count({
      where: {
        submittedAt: {
          gte: sevenDaysAgo,
        },
      },
    }),
  ]);

  return jsonResponse({
    totalForms,
    totalSubmissions,
    submittedForms,
    submissionsToday,
    submissionsLast7Days,
  });
}
