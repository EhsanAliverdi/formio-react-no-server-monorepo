import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import ComponentCard from "../../../template/tailAdmin/components/common/ComponentCard";
import type { UserProfileUpdate, UserRow } from "./types";

type FormState = {
  display_name: string;
  first_name: string;
  last_name: string;
  phone: string;
  job_title: string;
  department: string;
};

function toFormState(user: UserRow): FormState {
  return {
    display_name: user.display_name ?? "",
    first_name: user.first_name ?? "",
    last_name: user.last_name ?? "",
    phone: user.phone ?? "",
    job_title: user.job_title ?? "",
    department: user.department ?? "",
  };
}

export type UserProfileEditorProps = {
  title?: string;
  description?: string;
  user: UserRow | null;
  loading: boolean;
  saving?: boolean;
  error?: string | null;
  onSave: (payload: UserProfileUpdate) => Promise<UserRow | void> | void;
  onReload?: () => Promise<void> | void;
  onUploadAvatar?: (file: File) => Promise<UserRow | void> | void;
};

export default function UserProfileEditor({
  title = "My Profile",
  description = "Update your user information.",
  user,
  loading,
  error,
  onSave,
  onReload,
  onUploadAvatar,
}: UserProfileEditorProps) {
  const [savingLocal, setSavingLocal] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrlOverride, setAvatarUrlOverride] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({
    display_name: "",
    first_name: "",
    last_name: "",
    phone: "",
    job_title: "",
    department: "",
  });

  useEffect(() => {
    if (!user) return;
    setForm(toFormState(user));
    setAvatarUrlOverride(null);
  }, [user]);

  const avatarUrl = (avatarUrlOverride ?? user?.avatar_url ?? "").trim();

  const handleAvatarUpload = async (file: File) => {
    if (!onUploadAvatar) return;
    setUploadingAvatar(true);
    try {
      const updated = await onUploadAvatar(file);
      const updatedAny = updated as any;
      const nextUrl =
        typeof updatedAny?.user?.avatar_url === "string"
          ? String(updatedAny.user.avatar_url)
          : typeof updatedAny?.avatar_url === "string"
            ? String(updatedAny.avatar_url)
            : null;

      if (nextUrl) setAvatarUrlOverride(nextUrl);
      toast.success("Avatar uploaded");
      await onReload?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload avatar");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingLocal(true);
    try {
      await onSave(form);
      toast.success("Profile updated");
      await onReload?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSavingLocal(false);
    }
  };

  if (loading) {
    return <div className="text-gray-600">Loading…</div>;
  }

  if (error) {
    return <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>;
  }

  if (!user) {
    return <div className="rounded border border-red-200 bg-red-50 p-4 text-red-700">Failed to load profile.</div>;
  }

  return (
    <ComponentCard title={title} desc={description}>
      <div className="mb-6 rounded border border-gray-200 bg-gray-50 p-4">
        <div className="text-sm text-gray-600">Signed in as</div>
        <div className="text-base font-semibold text-gray-900">{user.email}</div>
        <div className="text-sm text-gray-600">Role: {user.role}</div>
      </div>

      <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={onSubmit}>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Avatar</label>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full overflow-hidden border border-gray-200 bg-white">
              <img
                src={avatarUrl || "/images/user/user-02.jpg"}
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            </div>

            {onUploadAvatar ? (
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  className="block text-sm"
                  disabled={uploadingAvatar}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    void handleAvatarUpload(f);
                    e.currentTarget.value = "";
                  }}
                />
                {uploadingAvatar ? (
                  <div className="text-sm text-gray-600">Uploading…</div>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Uploaded avatars are stored in MinIO under a user-specific prefix.
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Display name</label>
          <input
            className="w-full rounded border border-gray-300 px-3 py-2"
            value={form.display_name}
            onChange={(e) => setForm((s) => ({ ...s, display_name: e.target.value }))}
            placeholder="e.g. John Smith"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
          <input
            className="w-full rounded border border-gray-300 px-3 py-2"
            value={form.phone}
            onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
            placeholder="e.g. +61 400 000 000"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
          <input
            className="w-full rounded border border-gray-300 px-3 py-2"
            value={form.first_name}
            onChange={(e) => setForm((s) => ({ ...s, first_name: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
          <input
            className="w-full rounded border border-gray-300 px-3 py-2"
            value={form.last_name}
            onChange={(e) => setForm((s) => ({ ...s, last_name: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job title</label>
          <input
            className="w-full rounded border border-gray-300 px-3 py-2"
            value={form.job_title}
            onChange={(e) => setForm((s) => ({ ...s, job_title: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
          <input
            className="w-full rounded border border-gray-300 px-3 py-2"
            value={form.department}
            onChange={(e) => setForm((s) => ({ ...s, department: e.target.value }))}
          />
        </div>

        <div className="md:col-span-2 flex items-center gap-2">
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-lg transition px-4 py-3 text-sm bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={savingLocal}
          >
            {savingLocal ? "Saving…" : "Save changes"}
          </button>

          {onReload && (
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 rounded-lg transition px-4 py-3 text-sm bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300"
              onClick={() => void onReload()}
              disabled={savingLocal}
            >
              Reload
            </button>
          )}
        </div>
      </form>
    </ComponentCard>
  );
}
