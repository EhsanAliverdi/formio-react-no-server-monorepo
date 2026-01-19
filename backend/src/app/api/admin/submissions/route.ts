import { corsHeaders, jsonResponse, requireAdmin } from "@/lib/auth";
import { computeAbnormalities } from "@/lib/abnormalities";
import { prisma } from "@/lib/prisma";
import type { FormSubmission, Form as PrismaForm, User as PrismaUser } from "@prisma/client";

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

	const url = new URL(req.url);
	const limitRaw = url.searchParams.get("limit");
	const offsetRaw = url.searchParams.get("offset");
	const formIdRaw = url.searchParams.get("form_id");
	const qRaw = url.searchParams.get("q");
	const fromRaw = url.searchParams.get("from");
	const toRaw = url.searchParams.get("to");

	const limit = Math.max(1, Math.min(200, Number(limitRaw ?? 25) || 25));
	const offset = Math.max(0, Number(offsetRaw ?? 0) || 0);
	const formId = formIdRaw ? Number(formIdRaw) : null;
	const q = (qRaw ?? "").trim();
	const from = (fromRaw ?? "").trim();
	const to = (toRaw ?? "").trim();

	const where: any = {};
	const and: any[] = [];

	if (Number.isFinite(formId as any)) {
		and.push({ formId: formId as number });
	}

	if (q) {
		const or: any[] = [
			{ form: { name: { contains: q, mode: "insensitive" as const } } },
			{ user: { email: { contains: q, mode: "insensitive" as const } } },
		];

		// If the query looks like an integer, also match by id.
		if (/^\d+$/.test(q)) {
			const numericId = Number(q);
			if (Number.isFinite(numericId)) {
				or.push({ id: numericId });
			}
		}

		and.push({ OR: or });
	}

	// Optional date filtering (inclusive), expected YYYY-MM-DD.
	// Approximate the original ::date comparisons by using start/end-of-day bounds.
	const ymd = /^\d{4}-\d{2}-\d{2}$/;
	if (from && ymd.test(from)) {
		const fromDate = new Date(`${from}T00:00:00.000Z`);
		and.push({ submittedAt: { gte: fromDate } });
	}
	if (to && ymd.test(to)) {
		const toDate = new Date(`${to}T23:59:59.999Z`);
		and.push({ submittedAt: { lte: toDate } });
	}

	if (and.length) {
		where.AND = and;
	}

	const total = await prisma.formSubmission.count({ where });

	const submissions = await prisma.formSubmission.findMany({
		where,
		include: {
			form: true,
			user: true,
		},
		orderBy: { id: "desc" },
		take: limit,
		skip: offset,
	});

	type SubmissionWithRelations = FormSubmission & { form: PrismaForm; user: PrismaUser | null };
	const items = (submissions as SubmissionWithRelations[]).map((s) => {
		let parsedSchema: unknown = null;
		try {
			parsedSchema = s.form.json ? JSON.parse(String(s.form.json)) : null;
		} catch {
			parsedSchema = null;
		}

		let parsedData: unknown = null;
		try {
			parsedData = s.data ? JSON.parse(String(s.data)) : null;
		} catch {
			parsedData = null;
		}

		const abnormalities = computeAbnormalities(parsedSchema, parsedData);

		return {
			id: s.id,
			form_id: s.formId,
			form_name: s.form?.name ?? "",
			user_id: s.userId ?? null,
			user_email: s.user ? s.user.email : null,
			submitted_at: s.submittedAt.toISOString(),
			has_abnormalities: abnormalities.length > 0,
			abnormal_count: abnormalities.length,
		};
	});

	return jsonResponse({
		items,
		total,
		limit,
		offset,
	});
}
 