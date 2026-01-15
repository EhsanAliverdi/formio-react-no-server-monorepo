import { corsHeaders, jsonResponse, requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";

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

	const db = await getDb();
	const row = (await db.get(
		`
			SELECT
				s.id as id,
				s.form_id as form_id,
				f.name as form_name,
				f.json as form_json,
				s.user_id as user_id,
				s.submitted_at as submitted_at,
				s.data as data,
				s.updated_at as updated_at
			FROM form_submissions s
			JOIN forms f ON f.id = s.form_id
			WHERE s.id = ? AND s.user_id = ?
			LIMIT 1
		`,
		submissionId,
		auth.user.id
	)) as
		| {
				id: number;
				form_id: number;
				form_name: string;
				form_json: string;
				user_id: number;
				submitted_at: string;
				data: string;
				updated_at: string | null;
		  }
		| undefined;

	if (!row) {
		return jsonResponse({ error: "Not found" }, { status: 404 });
	}

	let parsedForm: unknown = null;
	try {
		parsedForm = row.form_json ? JSON.parse(String(row.form_json)) : null;
	} catch {
		parsedForm = null;
	}

	let parsedData: unknown = null;
	try {
		parsedData = row.data ? JSON.parse(String(row.data)) : null;
	} catch {
		parsedData = null;
	}

	return jsonResponse({
		id: Number(row.id),
		form_id: Number(row.form_id),
		form_name: String(row.form_name ?? ""),
		user_id: Number(row.user_id),
		user_email: auth.user.email,
		submitted_at: String(row.submitted_at ?? ""),
		updated_at: row.updated_at == null ? null : String(row.updated_at),
		form: parsedForm,
		data: parsedData,
		can_export_pdf: canExportPdfFromFormJson(parsedForm),
	});
}
