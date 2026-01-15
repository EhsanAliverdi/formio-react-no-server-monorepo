import { useMemo, useState } from "react";

import type { UserCreatePayload, UserRole } from "./types";
import { USER_ROLES } from "./types";

type ProfileState = {
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
};

const EMPTY_PROFILE: ProfileState = {
  display_name: "",
  preferred_name: "",
  first_name: "",
  middle_name: "",
  last_name: "",
  pronouns: "",
  date_of_birth: "",
  phone: "",
  job_title: "",
  department: "",
  company: "",
  website_url: "",
  bio: "",
  address_line1: "",
  address_line2: "",
  city: "",
  state: "",
  postal_code: "",
  country: "",
  timezone: "",
  locale: "",
};

export type CreateUserProps = {
  disabled?: boolean;
  roles?: UserRole[];
  onCreate: (payload: UserCreatePayload, avatarFile?: File | null) => Promise<void> | void;
  formId?: string;
};

export default function CreateUser({ disabled, roles = USER_ROLES, onCreate, formId }: CreateUserProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("viewer");
  const [isActive, setIsActive] = useState<0 | 1>(1);
  const [creating, setCreating] = useState(false);

  const [profile, setProfile] = useState<ProfileState>(EMPTY_PROFILE);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string>("");

  const clearAvatarPreview = () => {
    if (avatarPreviewUrl) URL.revokeObjectURL(avatarPreviewUrl);
    setAvatarPreviewUrl("");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload: UserCreatePayload = {
        email,
        password,
        role,
        is_active: isActive,
        ...profile,
      };

      await onCreate(payload, avatarFile);
      setEmail("");
      setPassword("");
      setRole("viewer");
      setIsActive(1);
      setProfile(EMPTY_PROFILE);
      setAvatarFile(null);
      clearAvatarPreview();
    } finally {
      setCreating(false);
    }
  };

  type TabId = "personal" | "work" | "address" | "bio";
  const tabs = useMemo(
    () =>
      [
        { id: "personal" as const, label: "Personal Information" },
        { id: "work" as const, label: "Work" },
        { id: "address" as const, label: "Address" },
        { id: "bio" as const, label: "Bio" },
      ] satisfies Array<{ id: TabId; label: string }>,
    []
  );
  const [activeTab, setActiveTab] = useState<TabId>("personal");

  const displayTitle = profile.display_name || profile.preferred_name || profile.first_name || email || "New user";
  const displaySubtitle = profile.job_title || role;

  return (
    <form
      id={formId}
      className="w-full"
      onSubmit={onSubmit}
      autoComplete="off"
      data-lpignore="true"
      data-1p-ignore="true"
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-4 min-w-0">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex flex-col items-center text-center">
              <div className="h-24 w-24 overflow-hidden rounded-full border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-800">
                {avatarPreviewUrl ? (
                  <img src={avatarPreviewUrl} alt="User avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-gray-600 dark:text-gray-200">
                    {(String(displayTitle).trim()[0] ?? "U").toUpperCase()}
                  </div>
                )}
              </div>

              <div className="mt-3 w-full">
                <label className="block text-xs font-medium text-gray-600 mb-1">Profile photo</label>
                <input
                  type="file"
                  accept="image/*"
                  className="block w-full text-sm"
                  disabled={disabled || creating}
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setAvatarFile(f);
                    clearAvatarPreview();
                    if (f) setAvatarPreviewUrl(URL.createObjectURL(f));
                    e.currentTarget.value = "";
                  }}
                />
                <div className="mt-1 text-xs text-gray-500">Optional (uploads to MinIO after user is created).</div>
              </div>

              <div className="mt-3 text-base font-semibold text-gray-900 dark:text-white truncate w-full">
                {displayTitle}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 truncate w-full">{displaySubtitle}</div>
              {email && <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate w-full">{email}</div>}
            </div>

            <div className="mt-4 border-t border-gray-100 dark:border-gray-800 pt-4">
              <div className="flex flex-col gap-2">
                {tabs.map((t) => {
                  const active = activeTab === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={
                        active
                          ? "w-full rounded border border-blue-200 bg-blue-50 px-3 py-2 text-left text-sm font-medium text-blue-700"
                          : "w-full rounded border border-gray-200 bg-white px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                      }
                      onClick={() => setActiveTab(t.id)}
                      disabled={disabled || creating}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-8 min-w-0">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="text-base font-semibold text-gray-900 dark:text-white">
              {tabs.find((t) => t.id === activeTab)?.label}
            </div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">Fill out the details for the new user.</div>

            {activeTab === "personal" && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    type="email"
                    name="create_user_email"
                    autoComplete="off"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={disabled || creating}
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    type="password"
                    name="create_user_password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={disabled || creating}
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    disabled={disabled || creating}
                  >
                    {roles.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="create_user_status"
                    value={String(isActive)}
                    onChange={(e) => setIsActive(e.target.value === "1" ? 1 : 0)}
                    disabled={disabled || creating}
                  >
                    <option value="1">Active</option>
                    <option value="0">Deactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display name</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="create_user_display_name"
                    autoComplete="off"
                    value={profile.display_name}
                    onChange={(e) => setProfile((s) => ({ ...s, display_name: e.target.value }))}
                    disabled={disabled || creating}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preferred name</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="create_user_preferred_name"
                    autoComplete="off"
                    value={profile.preferred_name}
                    onChange={(e) => setProfile((s) => ({ ...s, preferred_name: e.target.value }))}
                    disabled={disabled || creating}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="create_user_first_name"
                    autoComplete="off"
                    value={profile.first_name}
                    onChange={(e) => setProfile((s) => ({ ...s, first_name: e.target.value }))}
                    disabled={disabled || creating}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Middle name</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="create_user_middle_name"
                    autoComplete="off"
                    value={profile.middle_name}
                    onChange={(e) => setProfile((s) => ({ ...s, middle_name: e.target.value }))}
                    disabled={disabled || creating}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="create_user_last_name"
                    autoComplete="off"
                    value={profile.last_name}
                    onChange={(e) => setProfile((s) => ({ ...s, last_name: e.target.value }))}
                    disabled={disabled || creating}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pronouns</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="create_user_pronouns"
                    autoComplete="off"
                    value={profile.pronouns}
                    onChange={(e) => setProfile((s) => ({ ...s, pronouns: e.target.value }))}
                    disabled={disabled || creating}
                    placeholder="e.g., she/her, he/him, they/them"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of birth</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    type="date"
                    name="create_user_date_of_birth"
                    autoComplete="off"
                    value={profile.date_of_birth}
                    onChange={(e) => setProfile((s) => ({ ...s, date_of_birth: e.target.value }))}
                    disabled={disabled || creating}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="create_user_phone"
                    autoComplete="off"
                    value={profile.phone}
                    onChange={(e) => setProfile((s) => ({ ...s, phone: e.target.value }))}
                    disabled={disabled || creating}
                  />
                </div>
              </div>
            )}

            {activeTab === "work" && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job title</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="create_user_job_title"
                    autoComplete="off"
                    value={profile.job_title}
                    onChange={(e) => setProfile((s) => ({ ...s, job_title: e.target.value }))}
                    disabled={disabled || creating}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="create_user_department"
                    autoComplete="off"
                    value={profile.department}
                    onChange={(e) => setProfile((s) => ({ ...s, department: e.target.value }))}
                    disabled={disabled || creating}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="create_user_company"
                    autoComplete="off"
                    value={profile.company}
                    onChange={(e) => setProfile((s) => ({ ...s, company: e.target.value }))}
                    disabled={disabled || creating}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    type="url"
                    name="create_user_website_url"
                    autoComplete="off"
                    value={profile.website_url}
                    onChange={(e) => setProfile((s) => ({ ...s, website_url: e.target.value }))}
                    disabled={disabled || creating}
                    placeholder="https://…"
                  />
                </div>
              </div>
            )}

            {activeTab === "address" && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address line 1</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="create_user_address_line1"
                    autoComplete="off"
                    value={profile.address_line1}
                    onChange={(e) => setProfile((s) => ({ ...s, address_line1: e.target.value }))}
                    disabled={disabled || creating}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address line 2</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="create_user_address_line2"
                    autoComplete="off"
                    value={profile.address_line2}
                    onChange={(e) => setProfile((s) => ({ ...s, address_line2: e.target.value }))}
                    disabled={disabled || creating}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="create_user_city"
                    autoComplete="off"
                    value={profile.city}
                    onChange={(e) => setProfile((s) => ({ ...s, city: e.target.value }))}
                    disabled={disabled || creating}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State / Region</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="create_user_state"
                    autoComplete="off"
                    value={profile.state}
                    onChange={(e) => setProfile((s) => ({ ...s, state: e.target.value }))}
                    disabled={disabled || creating}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postal code</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="create_user_postal_code"
                    autoComplete="off"
                    value={profile.postal_code}
                    onChange={(e) => setProfile((s) => ({ ...s, postal_code: e.target.value }))}
                    disabled={disabled || creating}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="create_user_country"
                    autoComplete="off"
                    value={profile.country}
                    onChange={(e) => setProfile((s) => ({ ...s, country: e.target.value }))}
                    disabled={disabled || creating}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="create_user_timezone"
                    autoComplete="off"
                    value={profile.timezone}
                    onChange={(e) => setProfile((s) => ({ ...s, timezone: e.target.value }))}
                    disabled={disabled || creating}
                    placeholder="e.g., America/New_York"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Locale</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="create_user_locale"
                    autoComplete="off"
                    value={profile.locale}
                    onChange={(e) => setProfile((s) => ({ ...s, locale: e.target.value }))}
                    disabled={disabled || creating}
                    placeholder="e.g., en-US"
                  />
                </div>
              </div>
            )}

            {activeTab === "bio" && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                <textarea
                  className="w-full rounded border border-gray-300 px-3 py-2"
                  name="create_user_bio"
                  autoComplete="off"
                  value={profile.bio}
                  onChange={(e) => setProfile((s) => ({ ...s, bio: e.target.value }))}
                  disabled={disabled || creating}
                  rows={6}
                />
              </div>
            )}

            <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
          </div>
        </div>
      </div>
    </form>
  );
}
