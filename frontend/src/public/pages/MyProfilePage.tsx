import { useCallback, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { clearAuthToken, getAuthToken } from "../../shared/services/apiClient";
import { UserProfileEditor } from "../../shared/components/user";
import { getMyProfile, updateMyProfile, uploadMyAvatar, type UserRow } from "../../shared/services/userService";

function isAuthError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("(401)") || msg.includes("(403)");
}

export default function MyProfilePage() {
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UserRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);

  const token = getAuthToken();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const u = await getMyProfile();
      setUser(u);
    } catch (err) {
      if (isAuthError(err)) {
        clearAuthToken();
        setUnauthorized(true);
        return;
      }

      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    void load();
  }, [token, load]);

  if (!token || unauthorized) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <div className="w-full">
      <UserProfileEditor
        title="My Profile"
        description="Update your profile information."
        user={user}
        loading={loading}
        saving={saving}
        error={error}
        onReload={load}
        onUploadAvatar={async (file) => {
          try {
            const result = await uploadMyAvatar(file);
            const updated = (result?.user ?? null) as UserRow | null;
            if (updated) setUser(updated);
            return updated ?? undefined;
          } catch (err) {
            if (isAuthError(err)) {
              clearAuthToken();
              setUnauthorized(true);
              return;
            }
            throw err;
          }
        }}
        onSave={async (payload) => {
          setSaving(true);
          try {
            const result = await updateMyProfile(payload);
            const updated = (result?.user ?? null) as UserRow | null;
            if (updated) setUser(updated);
          } catch (err) {
            if (isAuthError(err)) {
              clearAuthToken();
              setUnauthorized(true);
              return;
            }
            throw err;
          } finally {
            setSaving(false);
          }
        }}
      />
    </div>
  );
}
