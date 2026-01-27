import MexMaintenanceSectionCards from "./MexMaintenanceSectionCards";

interface MexMaintenanceMaintenanceProps {
  basePath: string;
}

export default function MexMaintenanceMaintenance({ basePath }: MexMaintenanceMaintenanceProps) {
  return (
    <MexMaintenanceSectionCards
      title="Maintenance"
      description="Manage the full maintenance lifecycle from requests to execution."
      cards={[
        {
          title: "Work Orders",
          description: "Monitor active work orders, schedules, and execution status.",
          path: `${basePath}/maintenance/work-orders`,
          meta: "Lifecycle",
        },
        {
          title: "Requests",
          description: "Capture incoming maintenance requests and convert to work orders.",
          path: `${basePath}/maintenance/requests`,
          meta: "Intake",
        },
        {
          title: "Standard Jobs",
          description: "Raise work orders from standard job templates.",
          path: `${basePath}/maintenance/standard-jobs`,
          meta: "Templates",
        },
      ]}
    />
  );
}
