import MexMaintenanceSectionCards from "./MexMaintenanceSectionCards";

interface MexMaintenancePeopleProps {
  basePath: string;
}

export default function MexMaintenancePeople({ basePath }: MexMaintenancePeopleProps) {
  return (
    <MexMaintenanceSectionCards
      title="People"
      description="Manage employees and supplier relationships across maintenance operations."
      cards={[
        {
          title: "Employees",
          description: "Update employee profiles, trade codes, and department assignments.",
          path: `${basePath}/people/employees`,
          meta: "Workforce",
        },
        {
          title: "Suppliers",
          description: "Maintain supplier details and primary contacts.",
          path: `${basePath}/people/suppliers`,
          meta: "Partners",
        },
      ]}
    />
  );
}
