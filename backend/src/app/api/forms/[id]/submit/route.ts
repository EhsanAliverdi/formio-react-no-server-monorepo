import { corsHeaders, getUserFromRequest, jsonResponse } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canUserAccessForm } from "@/lib/formsAccess";

export const runtime = "nodejs";

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: RouteContext) {
  const { id } = await context.params;
  const formId = Number(id);
  if (!Number.isFinite(formId)) {
    return jsonResponse({ error: "Invalid form id" }, { status: 400 });
  }

  const form = await prisma.form.findUnique({
    where: { id: formId },
    select: { id: true, allowAnonymousSubmit: true, visibility: true },
  });
  if (!form) {
    return jsonResponse({ error: "Not found" }, { status: 404 });
  }

  const allowAnonymous = form.allowAnonymousSubmit ? 1 : 0;
  const visibility = form.visibility === "restricted" ? "restricted" : "public";

  const user = await getUserFromRequest(req);

  if (visibility === "restricted") {
    if (!user) {
      return jsonResponse({ error: "Unauthorized" }, { status: 401 });
    }
    const allowed = await canUserAccessForm(formId, { id: user.id, role: user.role });
    if (!allowed) {
      return jsonResponse({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    if (!allowAnonymous && !user) {
      return jsonResponse({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const body: unknown = await req.json().catch(() => null);
  const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  const data = obj && Object.prototype.hasOwnProperty.call(obj, "data") ? obj.data : body;

  if (!data || typeof data !== "object") {
    return jsonResponse({ error: "Missing submission data" }, { status: 400 });
  }

  const created = await prisma.formSubmission.create({
    data: {
      formId,
      userId: user ? user.id : null,
      data: JSON.stringify(data),
    },
    select: { id: true },
  });

  return jsonResponse({ success: true, id: created.id });
}
