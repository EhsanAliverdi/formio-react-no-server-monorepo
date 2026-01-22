import { Capacitor } from "@capacitor/core";

type ApiErrorPayload = { error?: string };

const DEFAULT_API_BASE = "http://localhost:3000";

export function getApiBaseUrl() {
  const fromEnv = (import.meta as any).env?.VITE_API_BASE_URL;
  if (typeof fromEnv === "string" && fromEnv.trim()) {
    return fromEnv.trim();
  }

  if (!Capacitor.isNativePlatform()) {
    if (typeof window !== "undefined" && window.location?.origin) {
      return window.location.origin;
    }
  }

  return DEFAULT_API_BASE;
}

const TOKEN_KEY = "authToken";

export function getAuthToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function readErrorBody(res: Response): Promise<string> {
  const contentType = res.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("application/json")) {
      const payload = (await res.json()) as ApiErrorPayload;
      if (payload?.error) return ` — ${payload.error}`;
    }
  } catch {
    // ignore
  }

  try {
    const text = await res.text();
    return text ? ` — ${text}` : "";
  } catch {
    return "";
  }
}

export async function apiFetch(path: string, init?: RequestInit) {
  const base = getApiBaseUrl();
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;

  const headers = new Headers(init?.headers ?? undefined);

  const body = init?.body;
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (!headers.has("Content-Type") && body && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAuthToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, {
    ...init,
    headers,
  });

  if (!res.ok) {
    throw new Error(`Request failed (${res.status})${await readErrorBody(res)}`);
  }

  return res;
}
