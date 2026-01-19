import { corsHeaders, getUserFromRequest, jsonResponse, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canUserAccessForm } from "@/lib/formsAccess";

type RouteContext = { params: Promise<{ id: string }> };

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(_req: Request, context: RouteContext) {
  const { id } = await context.params;
  const formId = Number(id);
  if (!Number.isFinite(formId)) {
    return jsonResponse({ error: "Invalid form id" }, { status: 400 });
  }

  const mode = new URL(_req.url).searchParams.get("mode");
  const isPublicMode = mode === "public";

  const user = await getUserFromRequest(_req);
  const isPrivileged = !isPublicMode && user && (user.role === "admin" || user.role === "editor");

  const form = await prisma.form.findUnique({ where: { id: formId } });

  if (!form) {
    return jsonResponse({ error: "Not found" }, { status: 404 });
  }

  if (!isPrivileged) {
    const allowed = await canUserAccessForm(
      formId,
      user ? { id: user.id, role: user.role } : null
    );
    if (!allowed) {
      return jsonResponse({ error: user ? "Forbidden" : "Unauthorized" }, { status: user ? 403 : 401 });
    }
  }

  let allowedRoles: string[] | undefined;
  let allowedUserIds: number[] | undefined;
  if (isPrivileged) {
    const [rolesRows, usersRows] = await Promise.all([
      prisma.formAllowedRole.findMany({ where: { formId }, orderBy: { role: "asc" } }),
      prisma.formAllowedUser.findMany({ where: { formId }, orderBy: { userId: "asc" } }),
    ]);
    allowedRoles = rolesRows.map((r) => r.role);
    allowedUserIds = usersRows.map((r) => r.userId);
  }

  return jsonResponse({
    id: form.id,
    name: form.name,
    json: JSON.parse(form.json),
    allow_anonymous_submit: form.allowAnonymousSubmit ? 1 : 0,
    visibility: form.visibility === "restricted" ? "restricted" : "public",
    ...(isPrivileged ? { allowed_roles: allowedRoles ?? [], allowed_user_ids: allowedUserIds ?? [] } : {}),
  });
}

export async function PUT(req: Request, context: RouteContext) {
  const auth = await requireRole(req, ["admin", "editor"]);
  if (!auth.ok) return auth.res;

  const { id } = await context.params;
  const body: unknown = await req.json().catch(() => null);
  const obj = body && typeof body === "object" ? (body as Record<string, unknown>) : null;

  const formId = Number(id);
  if (!Number.isFinite(formId)) {
    return jsonResponse({ error: "Invalid form id" }, { status: 400 });
  }

  const updates: string[] = [];
  const params: Array<string | number> = [];

  if (typeof obj?.name === "string") {
    updates.push("name = ?");
    params.push(obj.name);
  }

  if (obj && Object.prototype.hasOwnProperty.call(obj, "json")) {
    updates.push("json = ?");
    params.push(JSON.stringify(obj.json));
  }

  const hasAllow = !!obj && Object.prototype.hasOwnProperty.call(obj, "allow_anonymous_submit");
  if (hasAllow) {
    const allowRaw = obj.allow_anonymous_submit;
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
    updates.push("allow_anonymous_submit = ?");
    params.push(allowAnonymousSubmit);
  }

  const hasVisibility = !!obj && Object.prototype.hasOwnProperty.call(obj, "visibility");
  if (hasVisibility) {
    const visRaw = obj.visibility;
    const visibility = visRaw === "restricted" ? "restricted" : "public";
    updates.push("visibility = ?");
    params.push(visibility);
  }

  const hasAllowedRoles =
    !!obj && Object.prototype.hasOwnProperty.call(obj, "allowed_roles");
  const hasAllowedUsers =
    !!obj && Object.prototype.hasOwnProperty.call(obj, "allowed_user_ids");

  if (updates.length === 0 && !hasAllowedRoles && !hasAllowedUsers) {
    return jsonResponse({ error: "No changes" }, { status: 400 });
  }

  if (hasAllowedUsers && auth.user.role !== "admin") {
    return jsonResponse({ error: "Only admins can assign forms to specific users" }, { status: 403 });
  }

  const data: any = {};

  if (typeof obj?.name === "string") {
    data.name = obj.name;
  }

  if (obj && Object.prototype.hasOwnProperty.call(obj, "json")) {
    data.json = JSON.stringify(obj.json);
  }

  if (hasAllow) {
    const allowRaw = (obj as any).allow_anonymous_submit;
    const allowAnonymousSubmit =
      typeof allowRaw === "boolean"
        ? allowRaw
        : typeof allowRaw === "number"
          ? Boolean(allowRaw)
          : true;
    data.allowAnonymousSubmit = allowAnonymousSubmit;
  }

  let visibility: "public" | "restricted" | undefined;
  if (hasVisibility) {
    const visRaw = (obj as any).visibility;
    visibility = visRaw === "restricted" ? "restricted" : "public";
    data.visibility = visibility;
  }

  if (updates.length === 0 && !hasAllowedRoles && !hasAllowedUsers && Object.keys(data).length === 0) {
    return jsonResponse({ error: "No changes" }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.form.update({ where: { id: formId }, data });
      }

      // If visibility is set to public, clear assignments.
      if (hasVisibility && visibility === "public") {
        await tx.formAllowedRole.deleteMany({ where: { formId } });
        await tx.formAllowedUser.deleteMany({ where: { formId } });
      }

      if (hasAllowedRoles) {
        const allowedRolesRaw = Array.isArray(obj?.allowed_roles) ? (obj?.allowed_roles as unknown[]) : [];
        const allowedRoles = allowedRolesRaw.filter(
          (r: unknown) => r === "admin" || r === "editor" || r === "viewer"
        ) as Array<"admin" | "editor" | "viewer">;

        await tx.formAllowedRole.deleteMany({ where: { formId } });
        if (allowedRoles.length > 0) {
          await tx.formAllowedRole.createMany({
            data: allowedRoles.map((role) => ({ formId, role })),
            skipDuplicates: true,
          });
        }
      }

      if (hasAllowedUsers) {
        const allowedUserIdsRaw = Array.isArray(obj?.allowed_user_ids) ? (obj?.allowed_user_ids as unknown[]) : [];
        const allowedUserIds = allowedUserIdsRaw
          .map((v: unknown) => Number(v))
          .filter((n: number) => Number.isFinite(n) && n > 0);

        await tx.formAllowedUser.deleteMany({ where: { formId } });
        if (allowedUserIds.length > 0) {
          await tx.formAllowedUser.createMany({
            data: allowedUserIds.map((userId) => ({ formId, userId })),
            skipDuplicates: true,
          });
        }
      }
    });
  } catch (e) {
    if (e && typeof e === "object" && (e as any).code === "P2025") {
      return jsonResponse({ error: "Not found" }, { status: 404 });
    }
    return jsonResponse({ error: "Failed to update form" }, { status: 500 });
  }

  return jsonResponse({ success: true });
}

export async function DELETE(_req: Request, context: RouteContext) {
  const auth = await requireRole(_req, ["admin", "editor"]);
  if (!auth.ok) return auth.res;

  const { id } = await context.params;
  const formId = Number(id);
  if (!Number.isFinite(formId)) {
    return jsonResponse({ error: "Invalid form id" }, { status: 400 });
  }

  try {
    await prisma.form.delete({ where: { id: formId } });
  } catch (e) {
    if (e && typeof e === "object" && (e as any).code === "P2025") {
      return jsonResponse({ error: "Not found" }, { status: 404 });
    }
    return jsonResponse({ error: "Failed to delete form" }, { status: 500 });
  }

  return jsonResponse({ success: true });
}
