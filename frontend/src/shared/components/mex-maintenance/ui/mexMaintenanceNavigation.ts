import { mexMaintenanceCategories } from "./mexMaintenanceCatalog";

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

const getSdkHelpItems = (basePath: string): MexMaintenanceMenuItem[] =>
  mexMaintenanceCategories.flatMap((category) =>
    category.modules.map((module) => ({
      id: module.id,
      label: `SDK Help · ${module.name}`,
      path: `${basePath}/${module.id}`,
      description: module.description,
    }))
  );

export const getMexMaintenanceMenu = (
  basePath: string,
  options?: { showSdkHelp?: boolean }
): MexMaintenanceMenuSection[] => {
  const menuItems: MexMaintenanceMenuItem[] = [
    {
      id: "overview",
      label: "Overview",
      path: basePath,
      description: "Dashboard and endpoint results.",
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
  ];

  if (options?.showSdkHelp ?? true) {
    menuItems.push(...getSdkHelpItems(basePath));
  }

  return [
    {
      id: "mex-maintenance",
      label: "MEX Maintenance",
      items: menuItems,
    },
  ];
};
