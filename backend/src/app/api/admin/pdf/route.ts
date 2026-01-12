import { corsHeaders, jsonResponse, requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";

function ensurePdfExt(name: string): string {
	const trimmed = name.trim();
	if (!trimmed) return "export.pdf";
	return trimmed.toLowerCase().endsWith(".pdf") ? trimmed : `${trimmed}.pdf`;
}

function safeContentDispositionFilename(name: string): string {
	// Keep it simple and safe for Content-Disposition.
	const normalized = ensurePdfExt(name)
		.replace(/[^a-zA-Z0-9._ -]/g, "_")
		.replace(/\s+/g, " ")
		.trim();
	return normalized || "export.pdf";
}

export async function OPTIONS() {
	return new Response(null, {
		status: 204,
		headers: corsHeaders,
	});
}

export async function POST(req: Request) {
	const auth = await requireAdmin(req);
	if (!auth.ok) return auth.res;

	let body: unknown;
	try {
		body = await req.json();
	} catch {
		body = null;
	}

	const html = body && typeof body === "object" ? (body as any).html : undefined;
	const fileName = body && typeof body === "object" ? (body as any).fileName : undefined;

	if (typeof html !== "string" || !html.trim()) {
		return new Response(JSON.stringify({ error: "Invalid payload: expected { html: string }" }), {
			status: 400,
			headers: {
				...corsHeaders,
				"Content-Type": "application/json",
			},
		});
	}

	// Basic size guard so this can’t be abused accidentally.
	if (html.length > 2_000_000) {
		return new Response(JSON.stringify({ error: "Payload too large" }), {
			status: 413,
			headers: {
				...corsHeaders,
				"Content-Type": "application/json",
			},
		});
	}

	const finalFileName = safeContentDispositionFilename(typeof fileName === "string" ? fileName : "export.pdf");

	let browser: any | null = null;
	try {
		// Lazy import so normal API usage doesn’t pay the cost.
		const { chromium } = await import("playwright");

		browser = await chromium.launch({
			headless: true,
		});

		const page = await browser.newPage({
			viewport: { width: 1200, height: 900 },
		});

		await page.setContent(html, { waitUntil: "networkidle" });

		const pdf = await page.pdf({
			format: "A4",
			preferCSSPageSize: true,
			printBackground: true,
			margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
		});
		const pdfBytes = new Uint8Array(pdf);

		return new Response(pdfBytes, {
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

		return jsonResponse(
			{ error: `PDF export failed: ${message}`, hint },
			{ status: 500 }
		);
	} finally {
		try {
			await browser?.close?.();
		} catch {
			// ignore
		}
	}
}
