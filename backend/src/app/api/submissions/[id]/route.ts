import { corsHeaders, jsonResponse, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function OPTIONS() {
	return new Response(null, {
		status: 204,
		headers: corsHeaders,
	});
}

type RouteContext = { params: Promise<{ id: string }> };

function canExportPdfFromFormJson(formJson: unknown): boolean {
	if (!formJson || typeof formJson !== "object") return false;
	const form = formJson as Record<string, unknown>;
	const appSettings =
		form.appSettings && typeof form.appSettings === "object"
			? (form.appSettings as Record<string, unknown>)
			: null;
	if (!appSettings) return false;

	if (appSettings.allowSubmissionPdfExport === true) return true;
	if (appSettings.allowDraftPdfBeforeSubmit === true) return true;
	return false;
}

export async function GET(req: Request, context: RouteContext) {
	const auth = await requireRole(req, ["admin", "editor", "viewer"]);
	if (!auth.ok) return auth.res;

	const { id } = await context.params;
	const submissionId = Number(id);
	if (!Number.isFinite(submissionId)) {
		return jsonResponse({ error: "Invalid submission id" }, { status: 400 });
	}

	const submission = await prisma.formSubmission.findFirst({
		where: { id: submissionId, userId: auth.user.id },
		include: { form: true },
	});

	if (!submission || !submission.form) {
		return jsonResponse({ error: "Not found" }, { status: 404 });
	}

	let parsedForm: unknown = null;
	try {
		parsedForm = submission.form.json ? JSON.parse(String(submission.form.json)) : null;
	} catch {
		parsedForm = null;
	}

	let parsedData: unknown = null;
	try {
		parsedData = submission.data ? JSON.parse(String(submission.data)) : null;
	} catch {
		parsedData = null;
	}

	return jsonResponse({
		id: submission.id,
		form_id: submission.formId,
		form_name: String(submission.form.name ?? ""),
		user_id: submission.userId,
		user_email: auth.user.email,
		submitted_at: submission.submittedAt.toISOString(),
		updated_at: submission.updatedAt ? submission.updatedAt.toISOString() : null,
		form: parsedForm,
		data: parsedData,
		can_export_pdf: canExportPdfFromFormJson(parsedForm),
	});
}
