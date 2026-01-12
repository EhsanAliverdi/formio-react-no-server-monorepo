import { useMemo, useState } from "react";

import type { UserRow, UserUpdatePayload } from "./types";
import { USER_ROLES } from "./types";

type EditProfileState = {
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
};

function toEditProfileState(u: UserRow): EditProfileState {
  return {
    display_name: u.display_name ?? "",
    preferred_name: u.preferred_name ?? "",
    first_name: u.first_name ?? "",
    middle_name: u.middle_name ?? "",
    last_name: u.last_name ?? "",
    pronouns: u.pronouns ?? "",
    date_of_birth: u.date_of_birth ?? "",
    phone: u.phone ?? "",
    job_title: u.job_title ?? "",
    department: u.department ?? "",
    company: u.company ?? "",
    website_url: u.website_url ?? "",
    bio: u.bio ?? "",
    address_line1: u.address_line1 ?? "",
    address_line2: u.address_line2 ?? "",
    city: u.city ?? "",
    state: u.state ?? "",
    postal_code: u.postal_code ?? "",
    country: u.country ?? "",
    timezone: u.timezone ?? "",
    locale: u.locale ?? "",
    avatar_url: u.avatar_url ?? "",
  };
}

export type EditUserProps = {
  user: UserRow;
  saving?: boolean;
  onSave: (payload: UserUpdatePayload) => Promise<void> | void;
  formId?: string;
};

export default function EditUser({ user, saving = false, onSave, formId }: EditUserProps) {
  const [role, setRole] = useState<UserRow["role"]>(() => user.role);
  const [isActive, setIsActive] = useState<0 | 1>(() => ((user.is_active ?? 1) ? 1 : 0));
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState<EditProfileState>(() => toEditProfileState(user));

  type TabId = "personal" | "work" | "address" | "bio" | "password";
  const tabs = useMemo(
    () =>
      [
        { id: "personal" as const, label: "Personal Information" },
        { id: "work" as const, label: "Work" },
        { id: "address" as const, label: "Address" },
        { id: "bio" as const, label: "Bio" },
        { id: "password" as const, label: "Change Password" },
      ] satisfies Array<{ id: TabId; label: string }>,
    []
  );
  const [activeTab, setActiveTab] = useState<TabId>("personal");

  const displayTitle = profile.display_name || profile.preferred_name || profile.first_name || user.email;
  const displaySubtitle = profile.job_title || role;

  const submit = async () => {
    const payload: UserUpdatePayload = {
      role,
      is_active: isActive,
      ...profile,
      ...(password.trim() ? { password } : {}),
    };
    await onSave(payload);
    setPassword("");
  };

  return (
    <form
      id={formId}
      className="w-full"
      autoComplete="off"
      data-lpignore="true"
      data-1p-ignore="true"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-4 min-w-0">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="flex flex-col items-center text-center">
              <div className="h-24 w-24 overflow-hidden rounded-full border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-gray-800">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="User avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-gray-600 dark:text-gray-200">
                    {(String(displayTitle).trim()[0] ?? "U").toUpperCase()}
                  </div>
                )}
              </div>

              <div className="mt-3 text-base font-semibold text-gray-900 dark:text-white truncate w-full">
                {displayTitle}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 truncate w-full">{displaySubtitle}</div>
              <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 truncate w-full">{user.email}</div>
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
                      disabled={saving}
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
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">Update user details and save changes.</div>

            {activeTab === "personal" && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="edit_user_role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRow["role"])}
                    disabled={saving}
                  >
                    {USER_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="edit_user_status"
                    value={String(isActive)}
                    onChange={(e) => setIsActive(e.target.value === "1" ? 1 : 0)}
                    disabled={saving}
                  >
                    <option value="1">Active</option>
                    <option value="0">Deactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display name</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="edit_user_display_name"
                    autoComplete="off"
                    value={profile.display_name}
                    onChange={(e) => setProfile((s) => ({ ...s, display_name: e.target.value }))}
                    disabled={saving}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preferred name</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="edit_user_preferred_name"
                    autoComplete="off"
                    value={profile.preferred_name}
                    onChange={(e) => setProfile((s) => ({ ...s, preferred_name: e.target.value }))}
                    disabled={saving}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="edit_user_phone"
                    autoComplete="off"
                    value={profile.phone}
                    onChange={(e) => setProfile((s) => ({ ...s, phone: e.target.value }))}
                    disabled={saving}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="edit_user_first_name"
                    autoComplete="off"
                    value={profile.first_name}
                    onChange={(e) => setProfile((s) => ({ ...s, first_name: e.target.value }))}
                    disabled={saving}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Middle name</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="edit_user_middle_name"
                    autoComplete="off"
                    value={profile.middle_name}
                    onChange={(e) => setProfile((s) => ({ ...s, middle_name: e.target.value }))}
                    disabled={saving}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="edit_user_last_name"
                    autoComplete="off"
                    value={profile.last_name}
                    onChange={(e) => setProfile((s) => ({ ...s, last_name: e.target.value }))}
                    disabled={saving}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pronouns</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="edit_user_pronouns"
                    autoComplete="off"
                    value={profile.pronouns}
                    onChange={(e) => setProfile((s) => ({ ...s, pronouns: e.target.value }))}
                    disabled={saving}
                    placeholder="e.g., she/her, he/him, they/them"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of birth</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    type="date"
                    name="edit_user_date_of_birth"
                    autoComplete="off"
                    value={profile.date_of_birth}
                    onChange={(e) => setProfile((s) => ({ ...s, date_of_birth: e.target.value }))}
                    disabled={saving}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Avatar URL</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="edit_user_avatar_url"
                    autoComplete="off"
                    value={profile.avatar_url}
                    onChange={(e) => setProfile((s) => ({ ...s, avatar_url: e.target.value }))}
                    disabled={saving}
                    placeholder="https://…"
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
                    name="edit_user_job_title"
                    autoComplete="off"
                    value={profile.job_title}
                    onChange={(e) => setProfile((s) => ({ ...s, job_title: e.target.value }))}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="edit_user_department"
                    autoComplete="off"
                    value={profile.department}
                    onChange={(e) => setProfile((s) => ({ ...s, department: e.target.value }))}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="edit_user_company"
                    autoComplete="off"
                    value={profile.company}
                    onChange={(e) => setProfile((s) => ({ ...s, company: e.target.value }))}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    type="url"
                    name="edit_user_website_url"
                    autoComplete="off"
                    value={profile.website_url}
                    onChange={(e) => setProfile((s) => ({ ...s, website_url: e.target.value }))}
                    disabled={saving}
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
                    name="edit_user_address_line1"
                    autoComplete="off"
                    value={profile.address_line1}
                    onChange={(e) => setProfile((s) => ({ ...s, address_line1: e.target.value }))}
                    disabled={saving}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address line 2</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="edit_user_address_line2"
                    autoComplete="off"
                    value={profile.address_line2}
                    onChange={(e) => setProfile((s) => ({ ...s, address_line2: e.target.value }))}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="edit_user_city"
                    autoComplete="off"
                    value={profile.city}
                    onChange={(e) => setProfile((s) => ({ ...s, city: e.target.value }))}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State / Region</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="edit_user_state"
                    autoComplete="off"
                    value={profile.state}
                    onChange={(e) => setProfile((s) => ({ ...s, state: e.target.value }))}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postal code</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="edit_user_postal_code"
                    autoComplete="off"
                    value={profile.postal_code}
                    onChange={(e) => setProfile((s) => ({ ...s, postal_code: e.target.value }))}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="edit_user_country"
                    autoComplete="off"
                    value={profile.country}
                    onChange={(e) => setProfile((s) => ({ ...s, country: e.target.value }))}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="edit_user_timezone"
                    autoComplete="off"
                    value={profile.timezone}
                    onChange={(e) => setProfile((s) => ({ ...s, timezone: e.target.value }))}
                    disabled={saving}
                    placeholder="e.g., America/New_York"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Locale</label>
                  <input
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    name="edit_user_locale"
                    autoComplete="off"
                    value={profile.locale}
                    onChange={(e) => setProfile((s) => ({ ...s, locale: e.target.value }))}
                    disabled={saving}
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
                  name="edit_user_bio"
                  autoComplete="off"
                  value={profile.bio}
                  onChange={(e) => setProfile((s) => ({ ...s, bio: e.target.value }))}
                  disabled={saving}
                  rows={6}
                />
              </div>
            )}

            {activeTab === "password" && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">New password (optional)</label>
                <input
                  className="w-full rounded border border-gray-300 px-3 py-2"
                  type="password"
                  name="edit_user_password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={saving}
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
