import MexMaintenanceSectionCards from "./MexMaintenanceSectionCards";

interface MexMaintenanceReportsProps {
  basePath: string;
}

export default function MexMaintenanceReports({ basePath }: MexMaintenanceReportsProps) {
  return (
    <MexMaintenanceSectionCards
      title="Reports"
      description="Read-only analytics and cost insights for maintenance leadership."
      cards={[
        {
          title: "Maintenance Backlog",
          description: "Open work orders awaiting completion.",
          path: `${basePath}/reports/backlog`,
          meta: "Read-only",
        },
        {
          title: "Labour vs Spares Cost",
          description: "Compare labor and spare part expenditure.",
          path: `${basePath}/reports/labour-vs-spares`,
          meta: "Read-only",
        },
        {
          title: "Supplier Spend",
          description: "Spend distribution by supplier invoices.",
          path: `${basePath}/reports/supplier-spend`,
          meta: "Read-only",
        },
        {
          title: "Asset Maintenance Cost",
          description: "Maintenance spend associated with assets.",
          path: `${basePath}/reports/asset-maintenance-cost`,
          meta: "Read-only",
        },
      ]}
    />
  );
}
