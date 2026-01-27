import MexMaintenanceSectionCards from "./MexMaintenanceSectionCards";

interface MexMaintenanceProcurementProps {
  basePath: string;
}

export default function MexMaintenanceProcurement({ basePath }: MexMaintenanceProcurementProps) {
  return (
    <MexMaintenanceSectionCards
      title="Procurement"
      description="Approve purchasing activity and manage supplier commitments."
      cards={[
        {
          title: "Purchase Orders",
          description: "Review and approve open purchase orders for maintenance.",
          path: `${basePath}/procurement/purchase-orders`,
          meta: "Approvals",
        },
        {
          title: "Requisitions",
          description: "Track requisitions awaiting review and approval.",
          path: `${basePath}/procurement/requisitions`,
          meta: "Requests",
        },
        {
          title: "Supplier Invoices",
          description: "Audit supplier invoices and reconcile totals.",
          path: `${basePath}/procurement/supplier-invoices`,
          meta: "Finance",
        },
      ]}
    />
  );
}
