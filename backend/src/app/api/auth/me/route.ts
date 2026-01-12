import { corsHeaders, getUserFromRequest, jsonResponse } from "@/lib/auth";

export const runtime = "nodejs";

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: Request) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return jsonResponse({ error: "Unauthorized" }, { status: 401 });
  }
  return jsonResponse({ user });
}
