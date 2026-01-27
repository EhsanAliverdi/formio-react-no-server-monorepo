import { FiBell, FiClipboard, FiFileText, FiHome, FiUsers, FiSettings, FiTool } from "react-icons/fi";

import type { NavItem } from "../template/tailAdmin/layout/AppSidebar";
import { getMexMaintenanceMenu } from "../shared/components/mex-maintenance";

export const buildAdminNavItems = (options?: { showSdkHelp?: boolean }): NavItem[] => {
  const mexMaintenanceNavItems: NavItem[] = getMexMaintenanceMenu("/admin/mex", {
    showSdkHelp: options?.showSdkHelp ?? true,
  }).map((section) => ({
    icon: <FiTool className="size-5" />,
    name: section.label,
    subItems: section.items.map((item) => ({
      name: item.label,
      path: item.path,
    })),
  }));

  return [
    {
      icon: <FiHome className="size-5" />,
      name: "Overview",
      path: "/admin",
    },
    {
      name: "Forms",
      icon: <FiFileText className="size-5" />,
      path: "/admin/forms",
    },
    {
      name: "Submissions",
      icon: <FiClipboard className="size-5" />,
      path: "/admin/submissions",
    },
    {
      name: "Users",
      icon: <FiUsers className="size-5" />,
      path: "/admin/users",
    },
    {
      name: "Notifications",
      icon: <FiBell className="size-5" />,
      path: "/admin/notifications",
    },
    {
      name: "Settings",
      icon: <FiSettings className="size-5" />,
      path: "/admin/settings",
    },
    ...mexMaintenanceNavItems,
  ];
};

export const adminOthersItems: NavItem[] = [
  
];
