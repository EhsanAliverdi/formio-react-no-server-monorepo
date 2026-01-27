import { FiBell, FiClipboard, FiFileText, FiHome, FiUsers, FiSettings, FiTool } from "react-icons/fi";

import type { NavItem } from "../template/tailAdmin/layout/AppSidebar";
import { mexMaintenanceCategories } from "../shared/services/mex-maintenance/ui/mexMaintenanceCatalog";

const mexMaintenanceNavItems: NavItem[] = [
  {
    icon: <FiTool className="size-5" />,
    name: "MEX Maintenance",
    subItems: [
      { name: "Overview", path: "/admin/mex" },
      { name: "Settings", path: "/admin/mex/settings" },
    ],
  },
  ...mexMaintenanceCategories.map((category) => ({
    icon: <FiTool className="size-5" />,
    name: `MEX ${category.name}`,
    subItems: category.modules.map((module) => ({
      name: module.name,
      path: `/admin/mex/${module.id}`,
    })),
  })),
];

export const adminNavItems: NavItem[] = [
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

export const adminOthersItems: NavItem[] = [
  
];
