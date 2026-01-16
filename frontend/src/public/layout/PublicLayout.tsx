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
import {
  getAdminSiteSettings,
  onSiteSettingsChanged,
  type AdminSiteSettings,
} from "../../shared/services/adminSettingsService";

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
    avatarUrl: typeof n.created_by_avatar_url === "string" ? n.created_by_avatar_url : undefined,
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

const publicSidebarBrandingDefaults = {
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
  const [siteSettings, setSiteSettings] = useState<AdminSiteSettings | null>(null);

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
    // Load site settings for shared branding (public + admin).
    let cancelled = false;

    const loadSettings = async () => {
      try {
        const s = await getAdminSiteSettings();
        if (cancelled) return;
        setSiteSettings(s);
      } catch {
        if (cancelled) return;
        setSiteSettings(null);
      }
    };

    void loadSettings();

    const stopListening = onSiteSettingsChanged(() => {
      void loadSettings();
    });

    return () => {
      cancelled = true;
      stopListening();
    };
  }, []);

  useEffect(() => {
    // Update favicon globally based on settings.
    const faviconUrl = (siteSettings?.faviconUrl ?? "").trim();
    const href = faviconUrl || "/favicon.ico";

    if (typeof document === "undefined") return;

    const links = Array.from(
      document.querySelectorAll<HTMLLinkElement>(
        "link[rel='icon'], link[rel='shortcut icon']",
      ),
    );

    if (links.length === 0) {
      const link = document.createElement("link");
      link.rel = "icon";
      link.href = href;
      document.head.appendChild(link);
      return;
    }

    for (const link of links) {
      link.href = href;
    }
  }, [siteSettings?.faviconUrl]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const siteName = (siteSettings?.siteName ?? "").trim() || "TailwindAdmin";
    document.title = siteName;
  }, [siteSettings?.siteName]);

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

  const effectiveBranding = {
    ...publicSidebarBrandingDefaults,
    expandedLightSrc:
      (siteSettings?.logoExpandedLightUrl ?? "").trim() || publicSidebarBrandingDefaults.expandedLightSrc,
    expandedDarkSrc:
      (siteSettings?.logoExpandedDarkUrl ?? "").trim() || publicSidebarBrandingDefaults.expandedDarkSrc,
    collapsedSrc:
      (siteSettings?.logoCollapsedUrl ?? "").trim() || publicSidebarBrandingDefaults.collapsedSrc,
    expandedWidth:
      siteSettings?.logoExpandedWidth != null
        ? siteSettings.logoExpandedWidth
        : publicSidebarBrandingDefaults.expandedWidth,
    expandedHeight:
      siteSettings?.logoExpandedHeight != null
        ? siteSettings.logoExpandedHeight
        : publicSidebarBrandingDefaults.expandedHeight,
    collapsedSize:
      siteSettings?.logoCollapsedSize != null
        ? siteSettings.logoCollapsedSize
        : publicSidebarBrandingDefaults.collapsedSize,
  };

  return (
    <AppLayout
      sidebarNavItems={publicNavItems}
      sidebarBranding={effectiveBranding}
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
