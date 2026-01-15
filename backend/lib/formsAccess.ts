import type { Db } from "./db";
import type { Role } from "./auth";

type FormVisibility = "public" | "restricted";

export type CurrentUser = {
  id: number;
  role: Role;
};

export async function getFormVisibility(db: Db, formId: number): Promise<FormVisibility | null> {
  const row = (await db.get(
    "SELECT visibility FROM forms WHERE id = ?",
    formId,
  )) as { visibility?: string } | undefined;

  if (!row) return null;

  return row.visibility === "restricted" ? "restricted" : "public";
}

export async function canUserAccessForm(db: Db, formId: number, user: CurrentUser | null): Promise<boolean> {
  const visibility = await getFormVisibility(db, formId);
  if (visibility === null) return false;
  if (visibility === "public") return true;

  // restricted
  if (!user) return false;

  const byRole = (await db.get(
    "SELECT 1 AS ok FROM form_allowed_roles WHERE form_id = ? AND role = ? LIMIT 1",
    formId,
    user.role,
  )) as { ok?: number } | undefined;
  if (byRole?.ok) return true;

  const byUser = (await db.get(
    "SELECT 1 AS ok FROM form_allowed_users WHERE form_id = ? AND user_id = ? LIMIT 1",
    formId,
    user.id,
  )) as { ok?: number } | undefined;
  if (byUser?.ok) return true;

  return false;
}

export async function listAccessibleForms(db: Db, user: CurrentUser | null) {
  if (!user) {
    return (await db.all(
      `
        SELECT
          f.id,
          f.name,
          f.json,
          f.allow_anonymous_submit
        FROM forms f
        WHERE f.visibility = 'public'
        ORDER BY f.id DESC
      `,
    )) as unknown[];
  }

  return (await db.all(
    `
      SELECT DISTINCT
        f.id,
        f.name,
        f.json,
        f.allow_anonymous_submit
      FROM forms f
      LEFT JOIN form_allowed_roles far ON far.form_id = f.id AND far.role = ?
      LEFT JOIN form_allowed_users fau ON fau.form_id = f.id AND fau.user_id = ?
      WHERE
        f.visibility = 'public'
        OR (f.visibility = 'restricted' AND (far.role IS NOT NULL OR fau.user_id IS NOT NULL))
      ORDER BY f.id DESC
    `,
    user.role,
    user.id,
  )) as unknown[];
}
