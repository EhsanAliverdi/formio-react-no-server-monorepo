import MexMaintenanceSectionCards from "./MexMaintenanceSectionCards";

interface MexMaintenanceAssetsInventoryProps {
  basePath: string;
}

export default function MexMaintenanceAssetsInventory({
  basePath,
}: MexMaintenanceAssetsInventoryProps) {
  return (
    <MexMaintenanceSectionCards
      title="Assets & Inventory"
      description="Maintain asset records and the materials required for maintenance execution."
      cards={[
        {
          title: "Assets",
          description: "Review asset performance, readings, and linked work orders.",
          path: `${basePath}/assets-inventory/assets`,
          meta: "Master Data",
        },
        {
          title: "Catalogue",
          description: "Search and manage catalogue materials and consumables.",
          path: `${basePath}/assets-inventory/catalogue`,
          meta: "Inventory",
        },
        {
          title: "Goods Receipts",
          description: "Track receipts against purchase orders and deliveries.",
          path: `${basePath}/assets-inventory/goods-receipts`,
          meta: "Receipts",
        },
      ]}
    />
  );
}
