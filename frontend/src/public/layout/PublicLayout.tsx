import { useEffect, useState } from "react";

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
import type { NavItem } from "../../template/tailAdmin/layout/AppSidebar";
import { FiFileText, FiHome } from "react-icons/fi";

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

const publicNavItems: NavItem[] = [
  {
    name: "Home",
    icon: <FiHome className="size-5" />,
    path: "/",
  },
  {
    name: "Forms",
    icon: <FiFileText className="size-5" />,
    path: "/forms",
  },
];

const publicSidebarBranding = {
  href: "/",
  expandedLightSrc: "/images/logo/logo.svg",
  expandedDarkSrc: "/images/logo/logo-dark.svg",
  collapsedSrc: "/images/logo/logo-icon.svg",
  alt: "Logo",
  expandedWidth: 150,
  expandedHeight: 40,
  collapsedSize: 32,
};

function deriveHeaderName(user: AuthUser): string {
  const display = (user.display_name ?? "").trim();
  if (display) return display;
  const preferred = (user.preferred_name ?? "").trim();
  if (preferred) return preferred;
  const first = (user.first_name ?? "").trim();
  const last = (user.last_name ?? "").trim();
  const full = [first, last].filter(Boolean).join(" ").trim();
  if (full) return full;

  return user.email.includes("@") ? (user.email.split("@")[0] ?? user.email) : user.email;
}

export default function PublicLayout() {
  const [loading, setLoading] = useState(() => Boolean(getAuthToken()));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [headerNotifications, setHeaderNotifications] = useState<HeaderNotification[]>([]);

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
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading…
      </div>
    );
  }

  return (
    <AppLayout
      sidebarNavItems={publicNavItems}
      sidebarBranding={publicSidebarBranding}
      headerUser={
        user
          ? {
              email: user.email,
              name: deriveHeaderName(user),
              avatarUrl: typeof user.avatar_url === "string" ? user.avatar_url : undefined,
              role: user.role,
            }
          : undefined
      }
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
      headerSignOutRedirectTo="/"
    />
  );
}
