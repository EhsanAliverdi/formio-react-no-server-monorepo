import { corsHeaders, jsonResponse, requireAdmin } from "@/lib/auth";
import { computeAbnormalities } from "@/lib/abnormalities";
import { getDb } from "@/lib/db";

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

	const db = await getDb();
	const row = await db.get(
		`
			SELECT
				s.id as id,
				s.form_id as form_id,
				f.name as form_name,
				f.json as form_json,
				s.user_id as user_id,
				u.email as user_email,
				s.submitted_at as submitted_at,
				s.data as data,
				s.updated_at as updated_at,
				s.updated_by as updated_by,
				u2.email as updated_by_email,
				s.edit_history as edit_history
			FROM form_submissions s
			JOIN forms f ON f.id = s.form_id
			LEFT JOIN users u ON u.id = s.user_id
			LEFT JOIN users u2 ON u2.id = s.updated_by
			WHERE s.id = ?
			LIMIT 1
		`,
		submissionId
	);

	if (!row) {
		return jsonResponse({ error: "Not found" }, { status: 404 });
	}

	let parsedSchema: unknown = null;
	try {
		parsedSchema = row.form_json ? JSON.parse(String(row.form_json)) : null;
	} catch {
		parsedSchema = null;
	}

	let parsedData: unknown = null;
	try {
		parsedData = row.data ? JSON.parse(String(row.data)) : null;
	} catch {
		parsedData = null;
	}

	let editHistory: unknown = [];
	try {
		editHistory = row.edit_history ? JSON.parse(String(row.edit_history)) : [];
	} catch {
		editHistory = [];
	}
	if (!Array.isArray(editHistory)) editHistory = [];

	const abnormalities = computeAbnormalities(parsedSchema, parsedData);

	return jsonResponse({
		id: Number(row.id),
		form_id: Number(row.form_id),
		form_name: String(row.form_name ?? ""),
		user_id: row.user_id == null ? null : Number(row.user_id),
		user_email: row.user_email == null ? null : String(row.user_email),
		submitted_at: String(row.submitted_at ?? ""),
		updated_at: row.updated_at == null ? null : String(row.updated_at),
		updated_by: row.updated_by == null ? null : Number(row.updated_by),
		updated_by_email: row.updated_by_email == null ? null : String(row.updated_by_email),
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

	const db = await getDb();

	const existing = await db.get(
		`
			SELECT
				s.id as id,
				s.form_id as form_id,
				f.name as form_name,
				f.json as form_json,
				s.user_id as user_id,
				u.email as user_email,
				s.submitted_at as submitted_at,
				s.data as data,
				s.updated_at as updated_at,
				s.updated_by as updated_by,
				u2.email as updated_by_email,
				s.edit_history as edit_history
			FROM form_submissions s
			JOIN forms f ON f.id = s.form_id
			LEFT JOIN users u ON u.id = s.user_id
			LEFT JOIN users u2 ON u2.id = s.updated_by
			WHERE s.id = ?
			LIMIT 1
		`,
		submissionId
	);

	if (!existing) {
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
		history = existing.edit_history ? JSON.parse(String(existing.edit_history)) : [];
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

	await db.run(
		`
			UPDATE form_submissions
			SET
				data = ?,
				updated_at = ?,
				updated_by = ?,
				edit_history = ?
			WHERE id = ?
		`,
		JSON.stringify(data),
		nowIso,
		auth.user.id,
		JSON.stringify(history),
		submissionId
	);

	// Return same shape as GET
	let parsedSchema: unknown = null;
	try {
		parsedSchema = existing.form_json ? JSON.parse(String(existing.form_json)) : null;
	} catch {
		parsedSchema = null;
	}

	const abnormalities = computeAbnormalities(parsedSchema, data);

	return jsonResponse({
		id: Number(existing.id),
		form_id: Number(existing.form_id),
		form_name: String(existing.form_name ?? ""),
		user_id: existing.user_id == null ? null : Number(existing.user_id),
		user_email: existing.user_email == null ? null : String(existing.user_email),
		submitted_at: String(existing.submitted_at ?? ""),
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
