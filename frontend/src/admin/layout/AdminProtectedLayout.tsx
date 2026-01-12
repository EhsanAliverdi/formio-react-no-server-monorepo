import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { clearAuthToken, getAuthToken } from "../../shared/services/apiClient";
import { logout, me, type AuthUser } from "../../shared/services/authService";
import {
  getMyNotifications,
  markNotificationRead,
  onNotificationsChanged,
  emitNotificationsChanged,
  type NotificationRow,
} from "../../shared/services/notificationsService";
import AppLayout from "../../template/tailAdmin/layout/AppLayout";
import { adminNavItems, adminOthersItems } from "../adminNav";
import { adminSidebarBranding } from "../adminBranding";

type HeaderNotification = {
  id: string | number;
  title: string;
  message?: string;
  when?: string;
  href?: string;
  read?: boolean;
  unread?: boolean;
  timeLabel?: string;
  avatarUrl?: string;
};

function formatWhen(value: string) {
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return value;
  return new Date(t).toLocaleString();
}

function mapHeaderNotification(n: NotificationRow): HeaderNotification {
  return {
    id: n.id,
    title: n.title,
    message: n.body,
    when: n.created_at,
    timeLabel: formatWhen(n.created_at),
    href: "/notifications",
    read: Boolean(n.read_at),
    unread: !n.read_at,
  };
}

const HEADER_NOTIFICATIONS_POLL_MS = 5000;

export default function AdminProtectedLayout() {
  const [loading, setLoading] = useState(() => Boolean(getAuthToken()));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [headerNotifications, setHeaderNotifications] = useState<HeaderNotification[]>([]);
  const location = useLocation();

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    let cancelled = false;

    me()
      .then((u) => {
        if (cancelled) return;
        setUser(u);
      })
      .catch(() => {
        if (cancelled) return;
        clearAuthToken();
        setUser(null);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "admin") return;

    let cancelled = false;

    const loadHeaderNotifications = async () => {
      try {
        const res = await getMyNotifications({ limit: 10, offset: 0 });
        if (cancelled) return;
        const mapped = (res.items ?? []).map(mapHeaderNotification);
        setHeaderNotifications(mapped);
      } catch {
        if (cancelled) return;
        setHeaderNotifications([]);
      }
    };

    void loadHeaderNotifications();

    const stopListening = onNotificationsChanged(() => {
      void loadHeaderNotifications();
    });

    const onFocus = () => {
      void loadHeaderNotifications();
    };
    window.addEventListener("focus", onFocus);

    const intervalId = window.setInterval(() => {
      void loadHeaderNotifications();
    }, HEADER_NOTIFICATIONS_POLL_MS);

    return () => {
      cancelled = true;
      stopListening();
      window.removeEventListener("focus", onFocus);
      window.clearInterval(intervalId);
    };
  }, [user]);

  if (loading) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center text-gray-600">Loading…</div>
      </>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (user.role !== "admin") {
    return <Navigate to="/no-access" replace state={{ from: location.pathname }} />;
  }

  return (
    <>
      <AppLayout
        sidebarNavItems={adminNavItems}
        sidebarOtherItems={adminOthersItems}
        sidebarBranding={adminSidebarBranding}
        headerUser={{
          email: user.email,
          name: user.email.includes("@") ? user.email.split("@")[0] : user.email,
          role: user.role,
        }}
        headerNotifications={headerNotifications}
        headerNotificationsHref="/notifications"
        onHeaderNotificationRead={(notificationId) => {
          const id = Number(notificationId);
          if (!Number.isFinite(id) || id <= 0) return;

          setHeaderNotifications((cur) =>
            cur.map((n) =>
              Number(n.id) === id
                ? {
                    ...n,
                    read: true,
                    unread: false,
                  }
                : n
            )
          );

          void markNotificationRead(id).catch(() => {
            // Best-effort; if it fails, keep UI optimistic.
          });

          emitNotificationsChanged();
        }}
        onHeaderSignOut={async () => {
          try {
            await logout();
          } finally {
            setHeaderNotifications([]);
            setUser(null);
          }
        }}
        headerSignOutRedirectTo="/admin/login"
      />
    </>
  );
}
