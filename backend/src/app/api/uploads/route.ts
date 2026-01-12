import { corsHeaders, jsonResponse } from "@/lib/auth";
import { uploadImageObject } from "@/lib/minio";

export const runtime = "nodejs";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB per image

function getPublicOrigin(req: Request) {
	const forwardedProto = req.headers.get("x-forwarded-proto");
	const forwardedHost = req.headers.get("x-forwarded-host");
	if (forwardedProto && forwardedHost) {
		return `${forwardedProto}://${forwardedHost}`;
	}

	const host = req.headers.get("host");
	if (host) {
		// Default to http because this API is typically served behind a reverse proxy that sets x-forwarded-proto.
		return `http://${host}`;
	}

	return new URL(req.url).origin;
}

export async function OPTIONS() {
	return new Response(null, { status: 204, headers: corsHeaders });
}

function isFile(x: unknown): x is File {
	return typeof File !== "undefined" && x instanceof File;
}

export async function POST(req: Request) {
	let form: FormData;
	try {
		form = await req.formData();
	} catch {
		return jsonResponse({ error: "Expected multipart/form-data" }, { status: 400 });
	}

	// Form.io can send files under different field names depending on config/version.
	// Collect any File entries from the form.
	const files: File[] = [];
	for (const [, value] of form.entries()) {
		if (isFile(value)) files.push(value);
	}
	if (files.length === 0) {
		return jsonResponse({ error: "No files uploaded" }, { status: 400 });
	}

	const origin = getPublicOrigin(req);

	// Form.io's built-in "url" storage provider expects the upload endpoint to return a JSON object
	// with a top-level `url` field. If it doesn't, Form.io falls back to `xhr.responseURL + '/' + name`,
	// which produces URLs like `/api/uploads?baseUrl=...&form=/filename.jpg` that then 405 on GET.
	const f = files[0];
	const contentType = typeof f.type === "string" && f.type ? f.type : "application/octet-stream";
	if (!contentType.toLowerCase().startsWith("image/")) {
		return jsonResponse({ error: "Only image uploads are allowed" }, { status: 415 });
	}

	if (typeof f.size === "number" && f.size > MAX_FILE_BYTES) {
		return jsonResponse({ error: `Image too large (max ${MAX_FILE_BYTES} bytes)` }, { status: 413 });
	}

	const ab = await f.arrayBuffer();
	if (ab.byteLength > MAX_FILE_BYTES) {
		return jsonResponse({ error: `Image too large (max ${MAX_FILE_BYTES} bytes)` }, { status: 413 });
	}

	const bytes = new Uint8Array(ab);
	const obj = await uploadImageObject({
		bytes,
		contentType,
		originalName: f.name || "image",
	});

	const keyPath = obj.key
		.split("/")
		.map((segment) => encodeURIComponent(segment))
		.join("/");

	return jsonResponse(
		{
			url: `${origin}/api/uploads/${keyPath}`,
			storage: "minio",
			key: obj.key,
			name: f.name || obj.key,
			originalName: f.name || obj.key,
			size: obj.size,
			type: obj.contentType,
		},
		{ status: 201 }
	);
}
