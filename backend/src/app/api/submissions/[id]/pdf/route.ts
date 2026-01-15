import { corsHeaders, jsonResponse, requireRole } from "@/lib/auth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

function ensurePdfExt(name: string): string {
	const trimmed = name.trim();
	if (!trimmed) return "export.pdf";
	return trimmed.toLowerCase().endsWith(".pdf") ? trimmed : `${trimmed}.pdf`;
}

function safeContentDispositionFilename(name: string): string {
	const normalized = ensurePdfExt(name)
		.replace(/[^a-zA-Z0-9._ -]/g, "_")
		.replace(/\s+/g, " ")
		.trim();
	return normalized || "export.pdf";
}

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

export async function OPTIONS() {
	return new Response(null, {
		status: 204,
		headers: corsHeaders,
	});
}

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: RouteContext) {
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
				f.name as form_name,
				f.json as form_json
			FROM form_submissions s
			JOIN forms f ON f.id = s.form_id
			WHERE s.id = ? AND s.user_id = ?
			LIMIT 1
		`,
		submissionId,
		auth.user.id
	)) as { id: number; form_name: string; form_json: string } | undefined;

	if (!row) {
		return jsonResponse({ error: "Not found" }, { status: 404 });
	}

	let parsedForm: unknown = null;
	try {
		parsedForm = row.form_json ? JSON.parse(String(row.form_json)) : null;
	} catch {
		parsedForm = null;
	}

	if (!canExportPdfFromFormJson(parsedForm)) {
		return jsonResponse({ error: "PDF export is not enabled for this form" }, { status: 403 });
	}

	let body: unknown;
	try {
		body = await req.json();
	} catch {
		body = null;
	}

	const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
	const html = obj?.html;
	const fileNameRaw = obj?.fileName;

	if (typeof html !== "string" || !html.trim()) {
		return jsonResponse({ error: "Invalid payload: expected { html: string }" }, { status: 400 });
	}
	if (html.length > 2_000_000) {
		return jsonResponse({ error: "Payload too large" }, { status: 413 });
	}

	const finalFileName = safeContentDispositionFilename(
		typeof fileNameRaw === "string" && fileNameRaw.trim()
			? fileNameRaw
			: `submission-${submissionId}-${String(row.form_name ?? "form")}`
	);

	let browser: unknown = null;
	try {
		const { chromium } = await import("playwright");

		type BrowserLike = {
			newPage: (opts: { viewport: { width: number; height: number } }) => Promise<PageLike>;
			close?: () => Promise<void>;
		};
		type PageLike = {
			setContent: (html: string, opts: { waitUntil: "networkidle" | "load" | "domcontentloaded" }) => Promise<void>;
			pdf: (opts: {
				format: "A4";
				preferCSSPageSize: boolean;
				printBackground: boolean;
				margin: { top: string; right: string; bottom: string; left: string };
			}) => Promise<Uint8Array | ArrayBuffer>;
		};

		browser = (await chromium.launch({ headless: true })) as unknown as BrowserLike;
		const page = await (browser as BrowserLike).newPage({ viewport: { width: 1200, height: 900 } });

		await page.setContent(html, { waitUntil: "networkidle" });
		const pdf = await page.pdf({
			format: "A4",
			preferCSSPageSize: true,
			printBackground: true,
			margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
		});

		const pdfBody =
			pdf instanceof Uint8Array
				? Buffer.from(pdf)
				: Buffer.from(new Uint8Array(pdf));

		return new Response(pdfBody, {
			status: 200,
			headers: {
				...corsHeaders,
				"Content-Type": "application/pdf",
				"Content-Disposition": `attachment; filename="${finalFileName}"`,
				"Cache-Control": "no-store",
			},
		});
	} catch (e: unknown) {
		const message = e instanceof Error ? e.message : String(e);
		const hint = message.toLowerCase().includes("playwright") || message.toLowerCase().includes("chromium")
			? "If this is a fresh install, run: npx playwright install chromium (in the backend folder)."
			: undefined;

		return jsonResponse({ error: `PDF export failed: ${message}`, hint }, { status: 500 });
	} finally {
		try {
			await (browser as { close?: () => Promise<void> } | null)?.close?.();
		} catch {
			// ignore
		}
	}
}
