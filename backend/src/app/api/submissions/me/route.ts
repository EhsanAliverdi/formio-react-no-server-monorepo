import { corsHeaders, jsonResponse, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function OPTIONS() {
	return new Response(null, {
		status: 204,
		headers: corsHeaders,
	});
}

function canExportPdfFromFormJson(formJson: unknown): boolean {
	if (!formJson || typeof formJson !== "object") return false;
	const form = formJson as Record<string, unknown>;
	const appSettings =
		form.appSettings && typeof form.appSettings === "object"
			? (form.appSettings as Record<string, unknown>)
			: null;
	if (!appSettings) return false;

	// New flag for exporting submissions, with a fallback to the older draft export flag.
	if (appSettings.allowSubmissionPdfExport === true) return true;
	if (appSettings.allowDraftPdfBeforeSubmit === true) return true;
	return false;
}

export async function GET(req: Request) {
	const auth = await requireRole(req, ["admin", "editor", "viewer"]);
	if (!auth.ok) return auth.res;

	const submissions = await prisma.formSubmission.findMany({
		where: { userId: auth.user.id },
		orderBy: { id: "desc" },
		include: { form: true },
	});

	const items = submissions.map((s) => {
		let parsedForm: unknown = null;
		try {
			parsedForm = s.form?.json ? JSON.parse(String(s.form.json)) : null;
		} catch {
			parsedForm = null;
		}

		return {
			id: s.id,
			form_id: s.formId,
			form_name: String(s.form?.name ?? ""),
			submitted_at: s.submittedAt.toISOString(),
			can_export_pdf: canExportPdfFromFormJson(parsedForm),
		};
	});

	return jsonResponse({ items });
}
