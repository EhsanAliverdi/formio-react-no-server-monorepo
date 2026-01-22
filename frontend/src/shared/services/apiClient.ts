import { Capacitor } from "@capacitor/core";

type ApiErrorPayload = { error?: string };

const DEFAULT_API_BASE = "http://localhost:3000";
const ANDROID_EMULATOR_DEFAULT_BASE = "http://10.0.2.2:3000";
const IOS_SIMULATOR_DEFAULT_BASE = "http://localhost:3000";
const ANDROID_EMULATOR_LOOPBACK_HOST = "10.0.2.2";
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1"]);

function stripTrailingSlash(value: string) {
  return value.endsWith("/") ? value.replace(/\/+$/, "") : value;
}

function adjustAndroidLoopback(value: string) {
  if (!value) return value;
  try {
    const url = new URL(value);
    if (LOOPBACK_HOSTS.has(url.hostname)) {
      url.hostname = ANDROID_EMULATOR_LOOPBACK_HOST;
      return stripTrailingSlash(url.toString());
    }
  } catch {
    // ignore invalid URL inputs
  }

  return stripTrailingSlash(value);
}

export function getApiBaseUrl() {
  const env = (import.meta as any).env ?? {};
  const webEnvBase = typeof env.VITE_API_BASE_URL === "string" ? env.VITE_API_BASE_URL.trim() : "";
  const nativeEnvBase =
    typeof env.VITE_CAPACITOR_API_BASE_URL === "string" ? env.VITE_CAPACITOR_API_BASE_URL.trim() : "";
  const androidEmulatorBase =
    typeof env.VITE_ANDROID_EMULATOR_API_BASE_URL === "string"
      ? env.VITE_ANDROID_EMULATOR_API_BASE_URL.trim()
      : "";
  const iosSimulatorBase =
    typeof env.VITE_IOS_SIMULATOR_API_BASE_URL === "string" ? env.VITE_IOS_SIMULATOR_API_BASE_URL.trim() : "";

  const origin =
    typeof window !== "undefined" && typeof window.location?.origin === "string"
      ? window.location.origin
      : "";

  if (Capacitor.isNativePlatform()) {
    const platform = Capacitor.getPlatform?.() ?? "web";
    if (platform === "android") {
      const candidate = androidEmulatorBase || nativeEnvBase || ANDROID_EMULATOR_DEFAULT_BASE;
      return adjustAndroidLoopback(candidate);
    }
    if (platform === "ios") {
      return nativeEnvBase || iosSimulatorBase || IOS_SIMULATOR_DEFAULT_BASE;
    }
    return nativeEnvBase || DEFAULT_API_BASE;
  }

  if (webEnvBase) return webEnvBase;
  if (origin.startsWith("http")) return origin;
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
