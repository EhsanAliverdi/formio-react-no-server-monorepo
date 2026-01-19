import { corsHeaders, getUserFromRequest, jsonResponse, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listAccessibleForms } from "@/lib/formsAccess";

export const runtime = "nodejs";

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function POST(req: Request) {
  const auth = await requireRole(req, ["admin", "editor"]);
  if (!auth.ok) return auth.res;

  const body = await req.json();
  if (!body.name || !body.json) {
    return jsonResponse({ error: "Missing name or json" }, { status: 400 });
  }

  const allowRaw = body.allow_anonymous_submit;
  const allowAnonymousSubmit =
    typeof allowRaw === "boolean"
      ? allowRaw
        ? 1
        : 0
      : typeof allowRaw === "number"
        ? allowRaw
          ? 1
          : 0
        : 1;

  const visibility = body.visibility === "restricted" ? "restricted" : "public";
  const allowedRolesRaw = Array.isArray(body.allowed_roles) ? body.allowed_roles : [];
  const allowedRoles = allowedRolesRaw.filter(
    (r: unknown) => r === "admin" || r === "editor" || r === "viewer"
  ) as Array<"admin" | "editor" | "viewer">;
  const allowedUserIdsRaw = Array.isArray(body.allowed_user_ids) ? body.allowed_user_ids : [];
  const allowedUserIds = allowedUserIdsRaw
    .map((id: unknown) => Number(id))
    .filter((id: number) => Number.isFinite(id) && id > 0);

  const data = {
    name: body.name as string,
    json: JSON.stringify(body.json),
    allowAnonymousSubmit: Boolean(allowAnonymousSubmit),
    visibility,
  };

  const created = await prisma.$transaction(async (tx) => {
    const form = await tx.form.create({ data });

    if (visibility === "restricted") {
      if (allowedRoles.length > 0) {
        await tx.formAllowedRole.createMany({
          data: allowedRoles.map((role) => ({ formId: form.id, role })),
          skipDuplicates: true,
        });
      }

      // Only admins can assign to specific users.
      if (auth.user.role === "admin" && allowedUserIds.length > 0) {
        await tx.formAllowedUser.createMany({
          data: allowedUserIds.map((userId: number) => ({ formId: form.id, userId })),
          skipDuplicates: true,
        });
      }
    }

    return form;
  });

  return jsonResponse({ success: true, id: created.id });
}

export async function GET(req: Request) {
  const mode = new URL(req.url).searchParams.get("mode");
  const isPublicMode = mode === "public";

  const user = await getUserFromRequest(req);

  // Admin/editor can see all forms (management UI).
  if (!isPublicMode && user && (user.role === "admin" || user.role === "editor")) {
    const forms = await prisma.form.findMany({
      orderBy: { id: "desc" },
    });

    const dto = forms.map((f) => ({
      id: f.id,
      name: f.name,
      json: f.json,
      allow_anonymous_submit: f.allowAnonymousSubmit ? 1 : 0,
      visibility: f.visibility === "restricted" ? "restricted" : "public",
    }));

    return jsonResponse(dto);
  }

  const forms = await listAccessibleForms(user ? { id: user.id, role: user.role } : null);
  return jsonResponse(forms);
}
