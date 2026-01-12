import { corsHeaders, jsonResponse } from "@/lib/auth";
import { getObjectBytes } from "@/lib/minio";

export const runtime = "nodejs";

export async function OPTIONS() {
	return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(
	req: Request,
	ctx: { params: Promise<{ key?: string[] }> }
) {
	const params = await ctx.params;
	const parts = Array.isArray(params.key) ? params.key : [];
	const key = parts.map((p) => decodeURIComponent(p)).join("/");

	if (!key) {
		return jsonResponse({ error: "Missing key" }, { status: 400 });
	}

	const obj = await getObjectBytes(key);
	if (!obj) {
		return jsonResponse({ error: "Not found" }, { status: 404 });
	}

	// Next's type system treats Uint8Array buffers as ArrayBufferLike (incl SharedArrayBuffer).
	// Normalize to a real ArrayBuffer to satisfy BlobPart typing.
	const ab = new ArrayBuffer(obj.bytes.byteLength);
	new Uint8Array(ab).set(obj.bytes);
	const blob = new Blob([ab], { type: obj.contentType });

	return new Response(blob, {
		status: 200,
		headers: {
			...corsHeaders,
			"Content-Type": obj.contentType,
			"Cache-Control": "public, max-age=31536000, immutable",
		},
	});
}
