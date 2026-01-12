import { apiFetch, clearAuthToken, setAuthToken } from "./apiClient";

export type AuthUser = {
  id: number;
  email: string;
  role: string;
};

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  const payload = (await res.json()) as { token: string; user: AuthUser };
  setAuthToken(payload.token);
  return payload.user;
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
  return payload.user;
}
