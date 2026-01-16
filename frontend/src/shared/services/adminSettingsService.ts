import { apiFetch } from "./apiClient";

export type AdminSiteSettings = {
  faviconUrl: string | null;
  logoExpandedLightUrl: string | null;
  logoExpandedDarkUrl: string | null;
  logoCollapsedUrl: string | null;
  logoExpandedWidth: number | null;
  logoExpandedHeight: number | null;
  logoCollapsedSize: number | null;
};

const DEFAULT_SETTINGS: AdminSiteSettings = {
  faviconUrl: null,
  logoExpandedLightUrl: null,
  logoExpandedDarkUrl: null,
  logoCollapsedUrl: null,
  logoExpandedWidth: null,
  logoExpandedHeight: null,
  logoCollapsedSize: null,
};

export async function getAdminSiteSettings(): Promise<AdminSiteSettings> {
  const res = await apiFetch("/api/admin/settings/site");
  const json = (await res.json()) as Partial<AdminSiteSettings> | null;
  return {
    ...DEFAULT_SETTINGS,
    ...(json ?? {}),
  };
}

export async function updateAdminSiteSettings(payload: Partial<AdminSiteSettings>): Promise<AdminSiteSettings> {
  const res = await apiFetch("/api/admin/settings/site", {
    method: "PUT",
    body: JSON.stringify(payload ?? {}),
  });
  const json = (await res.json()) as Partial<AdminSiteSettings> | null;
  return {
    ...DEFAULT_SETTINGS,
    ...(json ?? {}),
  };
}

export const SITE_SETTINGS_CHANGED_EVENT = "app:site-settings-changed";

export function emitSiteSettingsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SITE_SETTINGS_CHANGED_EVENT));
}

export function onSiteSettingsChanged(handler: () => void) {
  if (typeof window === "undefined") return () => {};
  const listener = () => handler();
  window.addEventListener(SITE_SETTINGS_CHANGED_EVENT, listener);
  return () => {
    window.removeEventListener(SITE_SETTINGS_CHANGED_EVENT, listener);
  };
}
