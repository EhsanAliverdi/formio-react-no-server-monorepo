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
      label: module.name,
      path: `${basePath}/${module.id}`,
      description: module.description,
    }))
  );

export const getMexMaintenanceMenu = (basePath: string): MexMaintenanceMenuSection[] => [
  {
    id: "overview",
    label: "MEX Maintenance",
    items: [
      {
        id: "overview",
        label: "Overview",
        path: basePath,
        description: "Dashboard and endpoint results.",
      },
      {
        id: "settings",
        label: "Settings",
        path: `${basePath}/settings`,
        description: "Configure MEX authentication and base URL.",
      },
    ],
  },
  {
    id: "sdk-help",
    label: "SDK Help",
    items: getSdkHelpItems(basePath),
  },
];
