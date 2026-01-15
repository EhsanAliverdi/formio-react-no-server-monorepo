import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import Button from "../../../template/tailAdmin/components/ui/button/Button";
import { Modal } from "../../../template/tailAdmin/components/ui/modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../../template/tailAdmin/components/ui/table";
import CreateUser from "./CreateUser";
import DeleteUser from "./DeleteUser";
import EditUser from "./EditUser";
import UserSearch from "./UserSearch";
import type { UserCreatePayload, UserRole, UserRow, UserUpdatePayload } from "./types";
import { USER_ROLES } from "./types";

export type AdminUserManagementProps = {
  title?: string;
  description?: string;
  canManageUsers: boolean;
  users: UserRow[];
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void> | void;
  onCreate: (payload: UserCreatePayload) => Promise<void> | void;
  onUpdate: (id: number, payload: UserUpdatePayload) => Promise<void> | void;
  onDelete: (id: number) => Promise<void> | void;
  roles?: UserRole[];
};

export default function AdminUserManagement({
  canManageUsers,
  users,
  loading,
  error,
  onRefresh,
  onCreate,
  onUpdate,
  onDelete,
  roles = USER_ROLES,
}: AdminUserManagementProps) {
  const deriveDisplayName = (u: UserRow): string => {
    const full = [u.first_name, u.middle_name, u.last_name].filter(Boolean).join(" ").trim();
    if (full) return full;
    const display = (u.display_name ?? "").trim();
    if (display) return display;
    const preferred = (u.preferred_name ?? "").trim();
    if (preferred) return preferred;
    if (u.email && u.email.includes("@")) return u.email.split("@")[0] ?? u.email;
    return u.email || "—";
  };

  const deriveInitials = (u: UserRow): string => {
    const name = deriveDisplayName(u);
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
    const initials = `${first}${last}`.trim().toUpperCase();
    if (initials) return initials;
    return (u.email?.[0] ?? "U").toUpperCase();
  };

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => b.id - a.id);
  }, [users]);

  const [search, setSearch] = useState("");

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedUsers;

    return sortedUsers.filter((u) => {
      const name = [u.display_name, u.preferred_name, u.first_name, u.last_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const dept = (u.department ?? "").toLowerCase();
      const email = (u.email ?? "").toLowerCase();
      const role = (u.role ?? "").toLowerCase();
      const status = ((u.is_active ?? 1) ? "active" : "deactive").toLowerCase();
      return name.includes(q) || dept.includes(q) || email.includes(q) || role.includes(q) || status.includes(q);
    });
  }, [search, sortedUsers]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [createSaving, setCreateSaving] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  const submitFormById = (formId: string) => {
    const el = document.getElementById(formId);
    if (el && el instanceof HTMLFormElement) {
      el.requestSubmit();
    }
  };

  const editingUser = useMemo(() => {
    if (editingUserId == null) return null;
    return users.find((u) => u.id === editingUserId) ?? null;
  }, [editingUserId, users]);

  const create = async (payload: UserCreatePayload) => {
    try {
      await onCreate(payload);
      toast.success("User created");
      await onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create user");
      throw err;
    }
  };

  const update = async (id: number, payload: UserUpdatePayload) => {
    try {
      await onUpdate(id, payload);
      toast.success("User updated");
      await onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user");
      throw err;
    }
  };

  const remove = async (id: number, email?: string) => {
    try {
      await onDelete(id);
      toast.success("User deleted");
      if (editingUserId === id) setEditingUserId(null);
      await onRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to delete user${email ? ` '${email}'` : ""}`);
      throw err;
    }
  };

  if (!canManageUsers) {
    return (
      <div className="w-full">
        <div className="rounded border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
          You don’t have permission to manage users.
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="w-full md:max-w-md">
          <UserSearch value={search} onChange={setSearch} disabled={loading} />
        </div>

        <div className="flex items-center justify-end">
          <Button variant="primary" size="md" onClick={() => setCreateOpen(true)} disabled={loading}>
            Create user
          </Button>
        </div>
      </div>

      {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700 mb-4">{error}</div>}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Name
                </TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Email
                </TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Department
                </TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Role
                </TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Status
                </TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Actions
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <td colSpan={6} className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {loading ? "Loading…" : "No users."}
                  </td>
                </TableRow>
              ) : (
                filteredUsers.map((u) => {
                  const displayName = deriveDisplayName(u);
                  const avatarUrl = typeof u.avatar_url === "string" ? u.avatar_url.trim() : "";
                  const hasAvatar = Boolean(avatarUrl);
                  const initials = deriveInitials(u);
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="px-5 py-4 text-sm text-gray-800 dark:text-white/90">
                        <div className="flex items-center gap-3">
                          <span className="h-9 w-9 overflow-hidden rounded-full border border-gray-200 bg-white dark:border-gray-800">
                            {hasAvatar ? (
                              <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-700 text-xs font-semibold dark:bg-gray-800 dark:text-gray-200">
                                {initials}
                              </span>
                            )}
                          </span>
                          <span className="min-w-0 truncate">{displayName || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-800 dark:text-white/90">{u.email}</TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-800 dark:text-white/90">{u.department ?? "—"}</TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-800 dark:text-white/90">{u.role}</TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-800 dark:text-white/90">{(u.is_active ?? 1) ? "Active" : "Deactive"}</TableCell>
                      <TableCell className="px-5 py-4 text-sm text-gray-800 dark:text-white/90">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="px-3! py-2! text-xs!"
                            onClick={() => setEditingUserId(u.id)}
                          >
                            Edit
                          </Button>
                          <DeleteUser
                            disabled={loading}
                            confirmText={`Delete user '${u.email}'?`}
                            onDelete={() => remove(u.id, u.email)}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} className="w-[80vw] h-[80vh] max-w-6xl overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">Create user</h3>
        </div>

        <div className="pt-4">
          <CreateUser
            formId="create-user-form"
            disabled={loading || createSaving}
            roles={roles}
            onCreate={async (payload) => {
              setCreateSaving(true);
              try {
                await create(payload);
                setCreateOpen(false);
              } finally {
                setCreateSaving(false);
              }
            }}
          />
        </div>

        <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg transition px-4 py-3 text-sm bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300"
            onClick={() => setCreateOpen(false)}
            disabled={loading || createSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg transition px-4 py-3 text-sm bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => submitFormById("create-user-form")}
            disabled={loading || createSaving}
          >
            {createSaving ? "Creating…" : "Create"}
          </button>
        </div>
      </Modal>

      <Modal isOpen={Boolean(editingUser)} onClose={() => setEditingUserId(null)} className="w-[80vw] h-[80vh] max-w-6xl overflow-y-auto p-6">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
            {editingUser ? `Edit user: ${editingUser.email}` : "Edit user"}
          </h3>
        </div>

        <div className="pt-4">
          {editingUser && (
            <EditUser
              key={editingUser.id}
              formId={`edit-user-form-${editingUser.id}`}
              user={editingUser}
              saving={editSaving}
              onSave={async (payload) => {
                setEditSaving(true);
                try {
                  await update(editingUser.id, payload);
                  setEditingUserId(null);
                } finally {
                  setEditSaving(false);
                }
              }}
            />
          )}
        </div>

        <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg transition px-4 py-3 text-sm bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300"
            onClick={() => setEditingUserId(null)}
            disabled={editSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg transition px-4 py-3 text-sm bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => {
              if (editingUser) submitFormById(`edit-user-form-${editingUser.id}`);
            }}
            disabled={editSaving}
          >
            {editSaving ? "Saving…" : "Save"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
