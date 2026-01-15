import { corsHeaders, jsonResponse, requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";

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

	const db = await getDb();

	const rows = (await db.all(
		`
			SELECT
				s.id as id,
				s.form_id as form_id,
				f.name as form_name,
				f.json as form_json,
				s.submitted_at as submitted_at
			FROM form_submissions s
			JOIN forms f ON f.id = s.form_id
			WHERE s.user_id = ?
			ORDER BY s.id DESC
		`,
		auth.user.id
	)) as Array<{ id: number; form_id: number; form_name: string; form_json: string; submitted_at: string }>;

	const items = rows.map((r) => {
		let parsedForm: unknown = null;
		try {
			parsedForm = r.form_json ? JSON.parse(String(r.form_json)) : null;
		} catch {
			parsedForm = null;
		}

		return {
			id: Number(r.id),
			form_id: Number(r.form_id),
			form_name: String(r.form_name ?? ""),
			submitted_at: String(r.submitted_at ?? ""),
			can_export_pdf: canExportPdfFromFormJson(parsedForm),
		};
	});

	return jsonResponse({ items });
}
