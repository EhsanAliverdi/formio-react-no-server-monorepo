export type MexMaintenanceSubmenu = {
  id: string;
  label: string;
  path: string;
  description: string;
};

export const getMexMaintenanceSubmenus = (basePath: string): MexMaintenanceSubmenu[] => [
  {
    id: "overview",
    label: "Overview",
    path: `${basePath}/overview`,
    description: "Operational dashboard and KPIs.",
  },
  {
    id: "maintenance",
    label: "Maintenance",
    path: `${basePath}/maintenance`,
    description: "Work orders, requests, and standard jobs.",
  },
  {
    id: "assets-inventory",
    label: "Assets & Inventory",
    path: `${basePath}/assets-inventory`,
    description: "Assets, catalogue items, and goods receipts.",
  },
  {
    id: "procurement",
    label: "Procurement",
    path: `${basePath}/procurement`,
    description: "Purchase orders, requisitions, and invoices.",
  },
  {
    id: "people",
    label: "People",
    path: `${basePath}/people`,
    description: "Employees, suppliers, and key contacts.",
  },
  {
    id: "administration",
    label: "Administration",
    path: `${basePath}/administration`,
    description: "Reference data and configuration.",
  },
  {
    id: "reports",
    label: "Reports",
    path: `${basePath}/reports`,
    description: "Read-only operational analytics.",
  },
];
