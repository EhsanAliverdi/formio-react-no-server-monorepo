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

	const db = await getDb();

	const whereParts: string[] = [];
	const params: any[] = [];

	if (Number.isFinite(formId as any)) {
		whereParts.push("s.form_id = ?");
		params.push(formId);
	}

	if (q) {
		const qLower = q.toLowerCase();
		const qLike = `%${qLower}%`;
		whereParts.push(
			"(LOWER(f.name) LIKE ? OR LOWER(COALESCE(u.email, '')) LIKE ? OR CAST(s.id AS TEXT) LIKE ?)"
		);
		params.push(qLike, qLike, `%${q}%`);
	}

	// Optional date filtering (inclusive), expected YYYY-MM-DD.
	// Uses PostgreSQL date casting to compare against submitted_at timestamps.
	const ymd = /^\d{4}-\d{2}-\d{2}$/;
	if (from && ymd.test(from)) {
		whereParts.push("s.submitted_at::date >= ?::date");
		params.push(from);
	}
	if (to && ymd.test(to)) {
		whereParts.push("s.submitted_at::date <= ?::date");
		params.push(to);
	}

	const whereSql = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";

	const totalRow = await db.get<{ c: number }>(
		`
			SELECT COUNT(*) as c
			FROM form_submissions s
			JOIN forms f ON f.id = s.form_id
			LEFT JOIN users u ON u.id = s.user_id
			${whereSql}
		`,
		...params
	);
	const total = Number(totalRow?.c ?? 0);

	const pageParams = [...params, limit, offset];

	const rows = await db.all(
		`
			SELECT
				s.id as id,
				s.form_id as form_id,
				f.name as form_name,
				f.json as form_json,
				s.user_id as user_id,
				u.email as user_email,
				s.submitted_at as submitted_at,
				s.data as data
			FROM form_submissions s
			JOIN forms f ON f.id = s.form_id
			LEFT JOIN users u ON u.id = s.user_id
			${whereSql}
			ORDER BY s.id DESC
			LIMIT ? OFFSET ?
		`,
		...pageParams
	);

	const items = (rows ?? []).map((r: any) => {
			let parsedSchema: unknown = null;
			try {
				parsedSchema = r.form_json ? JSON.parse(String(r.form_json)) : null;
			} catch {
				parsedSchema = null;
			}

			let parsedData: unknown = null;
			try {
				parsedData = r.data ? JSON.parse(String(r.data)) : null;
			} catch {
				parsedData = null;
			}

			const abnormalities = computeAbnormalities(parsedSchema, parsedData);

			return {
				id: Number(r.id),
				form_id: Number(r.form_id),
				form_name: String(r.form_name ?? ""),
				user_id: r.user_id == null ? null : Number(r.user_id),
				user_email: r.user_email == null ? null : String(r.user_email),
				submitted_at: String(r.submitted_at ?? ""),
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
 