import { corsHeaders, jsonResponse, requireAdmin } from "@/lib/auth";
import { computeAbnormalities } from "@/lib/abnormalities";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function OPTIONS() {
	return new Response(null, {
		status: 204,
		headers: corsHeaders,
	});
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: RouteContext) {
	const auth = await requireAdmin(req);
	if (!auth.ok) return auth.res;

	const { id } = await context.params;
	const submissionId = Number(id);
	if (!Number.isFinite(submissionId)) {
		return jsonResponse({ error: "Invalid submission id" }, { status: 400 });
	}

	const submission = await prisma.formSubmission.findUnique({
		where: { id: submissionId },
		include: { form: true, user: true },
	});

	if (!submission || !submission.form) {
		return jsonResponse({ error: "Not found" }, { status: 404 });
	}

	let parsedSchema: unknown = null;
	try {
		parsedSchema = submission.form.json ? JSON.parse(String(submission.form.json)) : null;
	} catch {
		parsedSchema = null;
	}

	let parsedData: unknown = null;
	try {
		parsedData = submission.data ? JSON.parse(String(submission.data)) : null;
	} catch {
		parsedData = null;
	}

	let editHistory: unknown = [];
	try {
		editHistory = submission.editHistory ? JSON.parse(String(submission.editHistory)) : [];
	} catch {
		editHistory = [];
	}
	if (!Array.isArray(editHistory)) editHistory = [];

	const abnormalities = computeAbnormalities(parsedSchema, parsedData);

	let updatedByEmail: string | null = null;
	if (submission.updatedBy != null) {
		const updatedByUser = await prisma.user.findUnique({ where: { id: submission.updatedBy } });
		updatedByEmail = updatedByUser ? updatedByUser.email : null;
	}

	return jsonResponse({
		id: submission.id,
		form_id: submission.formId,
		form_name: submission.form.name ?? "",
		user_id: submission.userId ?? null,
		user_email: submission.user ? submission.user.email : null,
		submitted_at: submission.submittedAt.toISOString(),
		updated_at: submission.updatedAt ? submission.updatedAt.toISOString() : null,
		updated_by: submission.updatedBy ?? null,
		updated_by_email: updatedByEmail,
		edit_history: editHistory,
		form: parsedSchema,
		data: parsedData,
		has_abnormalities: abnormalities.length > 0,
		abnormalities,
	});
}

export async function PUT(req: Request, context: RouteContext) {
	const auth = await requireAdmin(req);
	if (!auth.ok) return auth.res;

	const { id } = await context.params;
	const submissionId = Number(id);
	if (!Number.isFinite(submissionId)) {
		return jsonResponse({ error: "Invalid submission id" }, { status: 400 });
	}

	let body: unknown;
	try {
		body = await req.json();
	} catch {
		body = null;
	}
	const data = body && typeof body === "object" ? (body as any).data : undefined;
	if (!data || typeof data !== "object") {
		return jsonResponse({ error: "Invalid payload: expected { data: object }" }, { status: 400 });
	}

	const existing = await prisma.formSubmission.findUnique({
		where: { id: submissionId },
		include: { form: true, user: true },
	});

	if (!existing || !existing.form) {
		return jsonResponse({ error: "Not found" }, { status: 404 });
	}

	let prevData: unknown = null;
	try {
		prevData = existing.data ? JSON.parse(String(existing.data)) : null;
	} catch {
		prevData = null;
	}

	let history: unknown = [];
	try {
		history = existing.editHistory ? JSON.parse(String(existing.editHistory)) : [];
	} catch {
		history = [];
	}
	if (!Array.isArray(history)) history = [];

	const nowIso = new Date().toISOString();
	(history as unknown[]).push({
		edited_at: nowIso,
		edited_by: { id: auth.user.id, email: auth.user.email },
		previous_data: prevData,
		new_data: data,
	});

	await prisma.formSubmission.update({
		where: { id: submissionId },
		data: {
			data: JSON.stringify(data),
			updatedAt: new Date(nowIso),
			updatedBy: auth.user.id,
			editHistory: JSON.stringify(history),
		},
	});

	// Return same shape as GET
	let parsedSchema: unknown = null;
	try {
		parsedSchema = existing.form.json ? JSON.parse(String(existing.form.json)) : null;
	} catch {
		parsedSchema = null;
	}

	const abnormalities = computeAbnormalities(parsedSchema, data);

	return jsonResponse({
		id: existing.id,
		form_id: existing.formId,
		form_name: existing.form.name ?? "",
		user_id: existing.userId ?? null,
		user_email: existing.user ? existing.user.email : null,
		submitted_at: existing.submittedAt.toISOString(),
		updated_at: nowIso,
		updated_by: auth.user.id,
		updated_by_email: auth.user.email,
		edit_history: history,
		form: parsedSchema,
		data,
		has_abnormalities: abnormalities.length > 0,
		abnormalities,
	});
}
