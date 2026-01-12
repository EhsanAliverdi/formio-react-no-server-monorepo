import { corsHeaders, deleteSessionByToken, extractBearerToken, jsonResponse } from "@/lib/auth";

export const runtime = "nodejs";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: Request) {
  const token = extractBearerToken(req);
  if (token) {
    await deleteSessionByToken(token);
  }
  return jsonResponse({ success: true });
}
