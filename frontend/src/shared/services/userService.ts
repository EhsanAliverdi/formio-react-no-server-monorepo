import { apiFetch, normalizeUploadUrl } from "./apiClient";

export type UserRow = {
  id: number;
  email: string;
  role: "admin" | "editor" | "viewer";
  is_active?: 0 | 1 | null;
  created_at?: string;
  display_name?: string | null;
  preferred_name?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  pronouns?: string | null;
  date_of_birth?: string | null;
  phone?: string | null;
  job_title?: string | null;
  department?: string | null;
  company?: string | null;
  website_url?: string | null;
  bio?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  timezone?: string | null;
  locale?: string | null;
  avatar_url?: string | null;
};

export type UserProfileUpdate = Partial<{
  display_name: string;
  preferred_name: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  pronouns: string;
  date_of_birth: string;
  phone: string;
  job_title: string;
  department: string;
  company: string;
  website_url: string;
  bio: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  timezone: string;
  locale: string;
  avatar_url: string;
}>;

function normalizeUser(user: UserRow): UserRow {
  if (!user || typeof user !== "object") return user;
  const avatar = typeof user.avatar_url === "string" ? normalizeUploadUrl(user.avatar_url) : user.avatar_url;
  if (avatar === user.avatar_url) return user;
  return { ...user, avatar_url: avatar };
}

export async function listUsers(opts?: {
  search?: string;
  roles?: Array<UserRow["role"]>;
  activeOnly?: boolean;
  limit?: number;
}): Promise<UserRow[]> {
  const params = new URLSearchParams();

  if (opts?.search && opts.search.trim()) params.set("search", opts.search.trim());
  if (opts?.activeOnly) params.set("active", "1");
  if (typeof opts?.limit === "number") params.set("limit", String(opts.limit));
  if (opts?.roles && opts.roles.length > 0) params.set("roles", opts.roles.join(","));

  const qs = params.toString();
  const res = await apiFetch(`/api/users${qs ? `?${qs}` : ""}`);
  const users = (await res.json()) as UserRow[];
  return Array.isArray(users) ? users.map(normalizeUser) : users;
}

export async function createUser(
  payload: { email: string; password: string; role: UserRow["role"]; is_active?: 0 | 1 } & UserProfileUpdate
): Promise<{ success: true; id: number }> {
  const res = await apiFetch("/api/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function getUserById(id: number): Promise<UserRow> {
  const res = await apiFetch(`/api/users/${id}`);
  const user = (await res.json()) as UserRow;
  return normalizeUser(user);
}

export async function updateUser(
  id: number,
  payload: Partial<{ role: UserRow["role"]; password: string; is_active: 0 | 1 }> & UserProfileUpdate
) {
  const res = await apiFetch(`/api/users/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    }
  );
  return res.json();
}

export async function deleteUser(id: number) {
  const res = await apiFetch(`/api/users/${id}`, { method: "DELETE" });
  return res.json();
}

export async function getMyProfile(): Promise<UserRow> {
  const res = await apiFetch("/api/users/me");
  const user = (await res.json()) as UserRow;
  return normalizeUser(user);
}

export async function updateMyProfile(payload: UserProfileUpdate) {
  const res = await apiFetch("/api/users/me", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function uploadMyAvatar(file: File): Promise<{ success: true; user: UserRow; avatar_url: string }> {
  const form = new FormData();
  form.append("file", file);

  const res = await apiFetch("/api/users/me/avatar", {
    method: "POST",
    body: form,
  });
  const payload = (await res.json()) as { success: true; user: UserRow; avatar_url: string };
  return {
    ...payload,
    avatar_url: normalizeUploadUrl(payload.avatar_url),
    user: normalizeUser(payload.user),
  };
}

export async function uploadUserAvatar(
  userId: number,
  file: File
): Promise<{ success: true; user: UserRow; avatar_url: string }> {
  const form = new FormData();
  form.append("file", file);

  const res = await apiFetch(`/api/users/${userId}/avatar`, {
    method: "POST",
    body: form,
  });
  const payload = (await res.json()) as { success: true; user: UserRow; avatar_url: string };
  return {
    ...payload,
    avatar_url: normalizeUploadUrl(payload.avatar_url),
    user: normalizeUser(payload.user),
  };
}
