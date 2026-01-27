import MexMaintenanceSectionCards from "./MexMaintenanceSectionCards";

interface MexMaintenanceAdministrationProps {
  basePath: string;
}

export default function MexMaintenanceAdministration({
  basePath,
}: MexMaintenanceAdministrationProps) {
  return (
    <MexMaintenanceSectionCards
      title="Administration"
      description="Maintain reference data, codes, and configuration values."
      cards={[
        {
          title: "Departments",
          description: "Operational departments and cost centers.",
          path: `${basePath}/administration/departments`,
          meta: "Reference",
        },
        {
          title: "Job Types",
          description: "Job type catalog for work order classification.",
          path: `${basePath}/administration/job-types`,
          meta: "Reference",
        },
        {
          title: "Priorities",
          description: "Priority definitions for maintenance scheduling.",
          path: `${basePath}/administration/priorities`,
          meta: "Reference",
        },
        {
          title: "Trade Codes",
          description: "Trade codes linked to labor skills.",
          path: `${basePath}/administration/trade-codes`,
          meta: "Reference",
        },
        {
          title: "Taxes",
          description: "Tax definitions used in procurement.",
          path: `${basePath}/administration/taxes`,
          meta: "Reference",
        },
        {
          title: "Currency Types",
          description: "Currency definitions for orders and invoices.",
          path: `${basePath}/administration/currency-types`,
          meta: "Reference",
        },
        {
          title: "Bin Locations",
          description: "Inventory bin locations and storage mapping.",
          path: `${basePath}/administration/bin-locations`,
          meta: "Reference",
        },
        {
          title: "Component Codes",
          description: "Component catalog and identification codes.",
          path: `${basePath}/administration/component-codes`,
          meta: "Reference",
        },
      ]}
    />
  );
}
