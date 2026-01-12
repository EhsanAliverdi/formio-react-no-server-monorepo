import { useEffect, useState } from "react";
import { UserProfileEditor } from "../../shared/components/user";
import { getMyProfile, updateMyProfile, type UserRow } from "../../shared/services/userService";

export default function AdminProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UserRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const u = await getMyProfile();
      setUser(u);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="w-full">
      <UserProfileEditor
        user={user}
        loading={loading}
        saving={saving}
        error={error}
        onReload={load}
        onSave={async (payload) => {
          setSaving(true);
          try {
            const result = await updateMyProfile(payload);
            const updated = (result?.user ?? null) as UserRow | null;
            if (updated) setUser(updated);
          } finally {
            setSaving(false);
          }
        }}
      />
    </div>
  );
}
