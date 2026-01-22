import { apiFetch, clearAuthToken, normalizeUploadUrl, setAuthToken } from "./apiClient";

export type AuthUser = {
  id: number;
  email: string;
  role: string;
  display_name?: string | null;
  preferred_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
};

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  const payload = (await res.json()) as { token: string; user: AuthUser };
  setAuthToken(payload.token);
  const avatarUrl =
    typeof payload.user.avatar_url === "string" ? normalizeUploadUrl(payload.user.avatar_url) : payload.user.avatar_url;
  return { ...payload.user, avatar_url: avatarUrl };
}

export async function logout(): Promise<void> {
  try {
    await apiFetch("/api/auth/logout", { method: "POST" });
  } finally {
    clearAuthToken();
  }
}

export async function me(): Promise<AuthUser> {
  const res = await apiFetch("/api/auth/me");
  const payload = (await res.json()) as { user: AuthUser };
  const avatarUrl =
    typeof payload.user.avatar_url === "string" ? normalizeUploadUrl(payload.user.avatar_url) : payload.user.avatar_url;
  return { ...payload.user, avatar_url: avatarUrl };
}
