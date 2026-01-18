import { useEffect, useState } from "react";
import Button from "../../template/tailAdmin/components/ui/button/Button";
import Label from "../../template/tailAdmin/components/form/Label";
import Input from "../../template/tailAdmin/components/form/input/InputField";
import FileUpload from "../../shared/components/ui/FileUpload";
import { apiFetch } from "../../shared/services/apiClient";
import {
  getAdminSiteSettings,
  updateAdminSiteSettings,
  type AdminSiteSettings,
  emitSiteSettingsChanged,
} from "../../shared/services/adminSettingsService";

function fallbackFaviconUrl(settings: AdminSiteSettings | null): string {
  const fromSettings = settings?.faviconUrl;
  if (typeof fromSettings === "string" && fromSettings.trim()) return fromSettings.trim();
  // Default favicon from public assets
  return "/favicon.ico";
}

function fallbackLogoExpandedLight(settings: AdminSiteSettings | null): string {
  const fromSettings = settings?.logoExpandedLightUrl;
  if (typeof fromSettings === "string" && fromSettings.trim()) return fromSettings.trim();
  return "/images/logo/logo.svg";
}

function fallbackLogoExpandedDark(settings: AdminSiteSettings | null): string {
  const fromSettings = settings?.logoExpandedDarkUrl;
  if (typeof fromSettings === "string" && fromSettings.trim()) return fromSettings.trim();
  return "/images/logo/logo-dark.svg";
}

function fallbackLogoCollapsed(settings: AdminSiteSettings | null): string {
  const fromSettings = settings?.logoCollapsedUrl;
  if (typeof fromSettings === "string" && fromSettings.trim()) return fromSettings.trim();
  return "/images/logo/logo-icon.svg";
}

async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);

  const res = await apiFetch("/api/uploads", {
    method: "POST",
    body: form,
  });
  const json = await res.json();
  const url = (json as any)?.url;
  if (typeof url !== "string" || !url.trim()) {
    throw new Error("Upload did not return a URL");
  }
  return url.trim();
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [settings, setSettings] = useState<AdminSiteSettings | null>(null);
  const [draft, setDraft] = useState<AdminSiteSettings | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      setSuccess(null);
      try {
        const s = await getAdminSiteSettings();
        setSettings(s);
        setDraft(s);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const effective = draft ?? settings;

  const handleUpload = async (
    file: File | null,
    field: "faviconUrl" | "logoExpandedLightUrl" | "logoExpandedDarkUrl" | "logoCollapsedUrl",
  ) => {
    if (!file) return;
    setError(null);
    setSuccess(null);
    try {
      const url = await uploadImage(file);
      setDraft((cur) => ({
        ...(cur ??
          settings ?? {
            siteName: null,
            faviconUrl: null,
            logoExpandedLightUrl: null,
            logoExpandedDarkUrl: null,
            logoCollapsedUrl: null,
            logoExpandedWidth: null,
            logoExpandedHeight: null,
            logoCollapsedSize: null,
          }),
        [field]: url,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to upload image");
    }
  };

  const onSave = async () => {
    if (!effective) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await updateAdminSiteSettings(effective);
      setSettings(updated);
      setDraft(updated);
      emitSiteSettingsChanged();
      setSuccess("Settings saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Site settings</h1>
          <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Configure favicon and admin sidebar logos. If not set, defaults are used.
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onSave} disabled={saving || loading}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-700 dark:bg-red-900/40 dark:text-red-100">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-100">
          {success}
        </div>
      )}

      {loading ? (
        <div className="text-gray-600 dark:text-gray-300">Loading…</div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">Site name</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              This name is used for the browser tab title. If not set, it defaults to TailwindAdmin.
            </p>

            <div className="mt-4 max-w-md space-y-2">
              <Label htmlFor="siteName">Site name</Label>
              <Input
                id="siteName"
                type="text"
                placeholder="TailwindAdmin"
                value={(effective?.siteName ?? "")}
                onChange={(e) => {
                  const value = e.target.value;
                  setDraft((cur) => ({
                    ...(cur ??
                      settings ?? {
                        siteName: null,
                        faviconUrl: null,
                        logoExpandedLightUrl: null,
                        logoExpandedDarkUrl: null,
                        logoCollapsedUrl: null,
                        logoExpandedWidth: null,
                        logoExpandedHeight: null,
                        logoCollapsedSize: null,
                      }),
                    siteName: value,
                  }));
                }}
                hint="Shown in the browser tab for both public and admin pages"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">Favicon</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              This icon appears in the browser tab. If not set, the default favicon is used.
            </p>

            <div className="mt-4 max-w-xl space-y-2">
              <Label htmlFor="siteFaviconUpload">Upload favicon</Label>
              <FileUpload
                id="siteFaviconUpload"
                mode="avatar"
                orientation="horizontal"
                multiple={false}
                accept="image/*"
                existingImageUrl={fallbackFaviconUrl(effective)}
                uploadLabel="Upload favicon"
                clearLabel="Delete"
                description="SVG, PNG, JPG or GIF (MAX. 800x400px)."
                filePondOptions={{
                  allowImagePreview: true,
                  imagePreviewHeight: 100,
                  allowImageCrop: true,
                  allowImageTransform: true,
                }}
                onFilesSelected={(files) => {
                  const file = files[0] ?? null;
                  void handleUpload(file, "faviconUrl");
                }}
                onClear={() => {
                  setError(null);
                  setSuccess(null);
                  setDraft((cur) => ({
                    ...(cur ??
                      settings ?? {
                        siteName: null,
                        faviconUrl: null,
                        logoExpandedLightUrl: null,
                        logoExpandedDarkUrl: null,
                        logoCollapsedUrl: null,
                        logoExpandedWidth: null,
                        logoExpandedHeight: null,
                        logoCollapsedSize: null,
                      }),
                    faviconUrl: null,
                  }));
                }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
            <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">Admin sidebar logo</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Logos used in the admin sidebar. If not set, the default logos from the theme are used.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">Expanded (light mode)</div>
                <FileUpload
                  mode="avatar"
                  orientation="vertical"
                  multiple={false}
                  accept="image/*"
                  existingImageUrl={fallbackLogoExpandedLight(effective)}
                  uploadLabel="Upload logo"
                  clearLabel="Delete"
                  description="SVG, PNG, JPG or GIF (MAX. 800x400px)."
                  filePondOptions={{
                    allowImagePreview: true,
                    imagePreviewHeight: 120,
                    allowImageCrop: true,
                    allowImageTransform: true,
                  }}
                  onFilesSelected={(files) => {
                    const file = files[0] ?? null;
                    void handleUpload(file, "logoExpandedLightUrl");
                  }}
                  onClear={() => {
                    setError(null);
                    setSuccess(null);
                    setDraft((cur) => ({
                      ...(cur ??
                        settings ?? {
                          siteName: null,
                          faviconUrl: null,
                          logoExpandedLightUrl: null,
                          logoExpandedDarkUrl: null,
                          logoCollapsedUrl: null,
                          logoExpandedWidth: null,
                          logoExpandedHeight: null,
                          logoCollapsedSize: null,
                        }),
                      logoExpandedLightUrl: null,
                    }));
                  }}
                />
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">Expanded (dark mode)</div>
                <FileUpload
                  mode="avatar"
                  orientation="vertical"
                  multiple={false}
                  accept="image/*"
                  existingImageUrl={fallbackLogoExpandedDark(effective)}
                  uploadLabel="Upload logo"
                  clearLabel="Delete"
                  description="SVG, PNG, JPG or GIF (MAX. 800x400px)."
                  filePondOptions={{
                    allowImagePreview: true,
                    imagePreviewHeight: 120,
                    allowImageCrop: true,
                    allowImageTransform: true,
                  }}
                  onFilesSelected={(files) => {
                    const file = files[0] ?? null;
                    void handleUpload(file, "logoExpandedDarkUrl");
                  }}
                  onClear={() => {
                    setError(null);
                    setSuccess(null);
                    setDraft((cur) => ({
                      ...(cur ??
                        settings ?? {
                          siteName: null,
                          faviconUrl: null,
                          logoExpandedLightUrl: null,
                          logoExpandedDarkUrl: null,
                          logoCollapsedUrl: null,
                          logoExpandedWidth: null,
                          logoExpandedHeight: null,
                          logoCollapsedSize: null,
                        }),
                      logoExpandedDarkUrl: null,
                    }));
                  }}
                />
              </div>

              <div className="space-y-3">
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">Collapsed icon</div>
                <FileUpload
                  mode="avatar"
                  orientation="vertical"
                  multiple={false}
                  accept="image/*"
                  existingImageUrl={fallbackLogoCollapsed(effective)}
                  uploadLabel="Upload icon"
                  clearLabel="Delete"
                  description="SVG, PNG, JPG or GIF (MAX. 800x400px)."
                  filePondOptions={{
                    allowImagePreview: true,
                    imagePreviewHeight: 80,
                    allowImageCrop: true,
                    allowImageTransform: true,
                  }}
                  onFilesSelected={(files) => {
                    const file = files[0] ?? null;
                    void handleUpload(file, "logoCollapsedUrl");
                  }}
                  onClear={() => {
                    setError(null);
                    setSuccess(null);
                    setDraft((cur) => ({
                      ...(cur ??
                        settings ?? {
                          siteName: null,
                          faviconUrl: null,
                          logoExpandedLightUrl: null,
                          logoExpandedDarkUrl: null,
                          logoCollapsedUrl: null,
                          logoExpandedWidth: null,
                          logoExpandedHeight: null,
                          logoCollapsedSize: null,
                        }),
                      logoCollapsedUrl: null,
                    }));
                  }}
                />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <Label htmlFor="logoExpandedWidth">Expanded logo width (px)</Label>
                <Input
                  id="logoExpandedWidth"
                  type="number"
                  placeholder="e.g. 150"
                  value={
                    effective?.logoExpandedWidth != null
                      ? String(effective.logoExpandedWidth)
                      : ""
                  }
                  onChange={(e) => {
                    const raw = e.target.value;
                    const n = Number(raw);
                    setDraft((cur) => ({
                      ...(cur ?? (settings ?? {
                        siteName: null,
                        faviconUrl: null,
                        logoExpandedLightUrl: null,
                        logoExpandedDarkUrl: null,
                        logoCollapsedUrl: null,
                        logoExpandedWidth: null,
                        logoExpandedHeight: null,
                        logoCollapsedSize: null,
                      })),
                      logoExpandedWidth:
                        Number.isFinite(n) && n > 0 ? n : null,
                    }));
                  }}
                  hint="Recommended ~150px"
                />
              </div>

              <div>
                <Label htmlFor="logoExpandedHeight">Expanded logo height (px)</Label>
                <Input
                  id="logoExpandedHeight"
                  type="number"
                  placeholder="e.g. 40"
                  value={
                    effective?.logoExpandedHeight != null
                      ? String(effective.logoExpandedHeight)
                      : ""
                  }
                  onChange={(e) => {
                    const raw = e.target.value;
                    const n = Number(raw);
                    setDraft((cur) => ({
                      ...(cur ?? (settings ?? {
                        siteName: null,
                        faviconUrl: null,
                        logoExpandedLightUrl: null,
                        logoExpandedDarkUrl: null,
                        logoCollapsedUrl: null,
                        logoExpandedWidth: null,
                        logoExpandedHeight: null,
                        logoCollapsedSize: null,
                      })),
                      logoExpandedHeight:
                        Number.isFinite(n) && n > 0 ? n : null,
                    }));
                  }}
                  hint="Recommended ~40px"
                />
              </div>

              <div>
                <Label htmlFor="logoCollapsedSize">Collapsed icon size (px)</Label>
                <Input
                  id="logoCollapsedSize"
                  type="number"
                  placeholder="e.g. 32"
                  value={
                    effective?.logoCollapsedSize != null
                      ? String(effective.logoCollapsedSize)
                      : ""
                  }
                  onChange={(e) => {
                    const raw = e.target.value;
                    const n = Number(raw);
                    setDraft((cur) => ({
                      ...(cur ?? (settings ?? {
                        siteName: null,
                        faviconUrl: null,
                        logoExpandedLightUrl: null,
                        logoExpandedDarkUrl: null,
                        logoCollapsedUrl: null,
                        logoExpandedWidth: null,
                        logoExpandedHeight: null,
                        logoCollapsedSize: null,
                      })),
                      logoCollapsedSize:
                        Number.isFinite(n) && n > 0 ? n : null,
                    }));
                  }}
                  hint="Recommended ~32px"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
