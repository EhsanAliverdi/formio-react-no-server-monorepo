import { FiBell, FiClipboard, FiFileText, FiHome, FiUsers } from "react-icons/fi";

import type { NavItem } from "../template/tailAdmin/layout/AppSidebar";

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
];

export const adminOthersItems: NavItem[] = [
  
];
