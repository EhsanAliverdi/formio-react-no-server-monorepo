import { useEffect, useState } from "react";
import { me, type AuthUser } from "../../shared/services/authService";
import { createUser, deleteUser, listUsers, updateUser, type UserRow } from "../../shared/services/userService";
import { AdminUserManagement } from "../../shared/components/user";

export default function AdminUsersPage() {
  const [viewer, setViewer] = useState<AuthUser | null>(null);
  const [loadingViewer, setLoadingViewer] = useState(true);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canManageUsers = viewer?.role === "admin";

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listUsers();
      setUsers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoadingViewer(true);
    me()
      .then((u) => {
        if (!cancelled) setViewer(u);
      })
      .catch(() => {
        if (!cancelled) setViewer(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingViewer(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loadingViewer && canManageUsers) {
      void load();
    }
  }, [loadingViewer, canManageUsers]);

  if (loadingViewer) {
    return <div className="text-gray-600">Loading…</div>;
  }

  return (
    <div className="w-full">
      <AdminUserManagement
        canManageUsers={canManageUsers}
        users={users}
        loading={loading}
        error={error}
        onRefresh={load}
        onCreate={async (payload) => {
          await createUser(payload);
        }}
        onUpdate={async (id, payload) => {
          await updateUser(id, payload);
        }}
        onDelete={async (id) => {
          await deleteUser(id);
        }}
      />
    </div>
  );
}
