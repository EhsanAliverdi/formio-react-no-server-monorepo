export type MexMaintenanceMenuItem = {
  id: string;
  label: string;
  path: string;
  description?: string;
};

export type MexMaintenanceMenuSection = {
  id: string;
  label: string;
  items: MexMaintenanceMenuItem[];
};

export const getMexMaintenanceMenu = (basePath: string): MexMaintenanceMenuSection[] => [
  {
    id: "core",
    label: "MEX Maintenance",
    items: [
      {
        id: "overview",
        label: "Overview",
        path: basePath,
        description: "Status, modules, and SDK links.",
      },
      {
        id: "work-orders",
        label: "Work Orders",
        path: `${basePath}/work-orders`,
        description: "Create, update, and browse work orders.",
      },
      {
        id: "work-management",
        label: "Work Management",
        path: `${basePath}/work-management`,
        description: "Job types, spares, trades, and standard jobs.",
      },
      {
        id: "employees",
        label: "Employees",
        path: `${basePath}/employees`,
        description: "Manage employee records for MEX actions.",
      },
      {
        id: "organization-people",
        label: "Organization & People",
        path: `${basePath}/organization-people`,
        description: "Browse contacts, departments, and employees.",
      },
      {
        id: "settings",
        label: "Settings",
        path: `${basePath}/settings`,
        description: "Configure MEX authentication and base URL.",
      },
    ],
  },
];
