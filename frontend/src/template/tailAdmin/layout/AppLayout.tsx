import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet } from "react-router-dom";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar, { type AppSidebarBranding, type NavItem } from "./AppSidebar";
import { ThemeProvider } from "../context/ThemeContext";

type TailAdminUser = {
  name?: string;
  email?: string;
  avatarUrl?: string;
  role?: string;
};

type TailAdminNotification = {
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

export type AppLayoutProps = {
  sidebarNavItems?: NavItem[];
  sidebarOtherItems?: NavItem[];
  sidebarBranding?: AppSidebarBranding;
  headerUser?: TailAdminUser;
  headerNotifications?: TailAdminNotification[];
  onHeaderNotificationRead?: (notificationId: string | number) => void | Promise<void>;
  headerNotificationsHref?: string;
  onHeaderSignOut?: () => void | Promise<void>;
  headerSignOutRedirectTo?: string;
};

const LayoutContent: React.FC<AppLayoutProps> = ({
  sidebarNavItems,
  sidebarOtherItems,
  sidebarBranding,
  headerUser,
  headerNotifications,
  onHeaderNotificationRead,
  headerNotificationsHref,
  onHeaderSignOut,
  headerSignOutRedirectTo,
}) => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  return (
    <div className="flex h-dvh xl:flex-row flex-col">
      <div>
        <AppSidebar
          navItems={sidebarNavItems}
          othersItems={sidebarOtherItems}
          branding={sidebarBranding}
        />
        <Backdrop />
      </div>
      <div
        className={`flex-1 min-w-0 flex flex-col transition-all duration-300 ease-in-out ${
          isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"
        } ${isMobileOpen ? "ml-0" : ""}`}
      >
        <AppHeader
          user={headerUser}
          notifications={headerNotifications}
          onNotificationRead={onHeaderNotificationRead}
          notificationsHref={headerNotificationsHref}
          onSignOut={onHeaderSignOut}
          signOutRedirectTo={headerSignOutRedirectTo}
          logoHref={sidebarBranding?.href ?? "/"}
        />
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
};

const AppLayout: React.FC<AppLayoutProps> = (props) => {
  return (
    <ThemeProvider>
      <SidebarProvider>
        <LayoutContent {...props} />
      </SidebarProvider>
    </ThemeProvider>
  );
};

export default AppLayout;
