import type { Role } from "./auth";
import { prisma } from "./prisma";
import type { Form } from "@prisma/client";

type FormVisibility = "public" | "restricted";

export type CurrentUser = {
  id: number;
  role: Role;
};

export async function getFormVisibility(formId: number): Promise<FormVisibility | null> {
  const form = await prisma.form.findUnique({
    where: { id: formId },
    select: { visibility: true },
  });

  if (!form) return null;

  return form.visibility === "restricted" ? "restricted" : "public";
}

export async function canUserAccessForm(formId: number, user: CurrentUser | null): Promise<boolean> {
  const visibility = await getFormVisibility(formId);
  if (visibility === null) return false;
  if (visibility === "public") return true;

  // restricted
  if (!user) return false;

  const byRole = await prisma.formAllowedRole.findFirst({
    where: { formId, role: user.role },
    select: { formId: true },
  });
  if (byRole) return true;

  const byUser = await prisma.formAllowedUser.findFirst({
    where: { formId, userId: user.id },
    select: { formId: true },
  });
  if (byUser) return true;

  return false;
}

export async function listAccessibleForms(user: CurrentUser | null) {
  if (!user) {
    const forms = await prisma.form.findMany({
      where: { visibility: "public" },
      orderBy: { id: "desc" },
    });

    return forms.map((f: Form) => ({
      id: f.id,
      name: f.name,
      json: f.json,
      allow_anonymous_submit: f.allowAnonymousSubmit ? 1 : 0,
    }));
  }

  const forms = await prisma.form.findMany({
    where: {
      OR: [
        { visibility: "public" },
        {
          AND: [
            { visibility: "restricted" },
            {
              OR: [
                { allowedRoles: { some: { role: user.role } } },
                { allowedUsers: { some: { userId: user.id } } },
              ],
            },
          ],
        },
      ],
    },
    orderBy: { id: "desc" },
  });

  return forms.map((f: Form) => ({
    id: f.id,
    name: f.name,
    json: f.json,
    allow_anonymous_submit: f.allowAnonymousSubmit ? 1 : 0,
  }));
}
