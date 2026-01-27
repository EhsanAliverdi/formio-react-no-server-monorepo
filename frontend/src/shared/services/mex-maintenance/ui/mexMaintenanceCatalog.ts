export type MexEndpoint = {
  method: string;
  path: string;
};

export type MexModuleDefinition = {
  id: string;
  name: string;
  description: string;
  endpoints: MexEndpoint[];
};

export type MexCategoryDefinition = {
  id: string;
  name: string;
  description: string;
  modules: MexModuleDefinition[];
};

const endpoint = (method: string, path: string): MexEndpoint => ({
  method,
  path,
});

export const mexMaintenanceCategories: MexCategoryDefinition[] = [
  {
    id: "governance",
    name: "Governance",
    description: "Approval routing and compliance metadata.",
    modules: [
      {
        id: "approval-path",
        name: "Approval Paths",
        description: "Manage approval path definitions and lookup helpers.",
        endpoints: [
          endpoint("GET", "/ApprovalPath/GetAll"),
          endpoint("GET", "/ApprovalPath/{approvalPathId}"),
          endpoint("GET", "/ApprovalPath/GetByApprovalPathName/{name}"),
        ],
      },
      {
        id: "document",
        name: "Documents",
        description: "Upload, update, and remove MEX documents.",
        endpoints: [
          endpoint("POST", "/Document/{actionedByContactId}"),
          endpoint("PUT", "/Document/{actionedByContactId}"),
          endpoint("DELETE", "/Document/delete?documentId={documentId}"),
        ],
      },
    ],
  },
  {
    id: "organization",
    name: "Organization & People",
    description: "Contacts, departments, and employee records.",
    modules: [
      {
        id: "contact",
        name: "Contacts",
        description: "Find contacts by username or full name.",
        endpoints: [
          endpoint("GET", "/Contact/GetByUsername/{username}"),
          endpoint("GET", "/Contact/GetByContactName/{fullName}"),
        ],
      },
      {
        id: "department",
        name: "Departments",
        description: "Browse and search departments.",
        endpoints: [
          endpoint("GET", "/Department/GetAll"),
          endpoint("GET", "/Department/{departmentId}"),
          endpoint("GET", "/Department/GetByDepartmentName/{name}"),
        ],
      },
      {
        id: "employee",
        name: "Employees",
        description: "Create and update employee data.",
        endpoints: [
          endpoint("GET", "/Employee/GetAll"),
          endpoint("GET", "/Employee/{employeeId}"),
          endpoint("POST", "/Employee/{actionedByContactId}"),
          endpoint("PUT", "/Employee/{employeeId}/{actionedByContactId}"),
        ],
      },
    ],
  },
  {
    id: "assets",
    name: "Assets & Locations",
    description: "Assets, readings, and physical storage locations.",
    modules: [
      {
        id: "asset",
        name: "Assets",
        description: "Create and update assets, and look up by asset number.",
        endpoints: [
          endpoint("GET", "/Asset/GetAll"),
          endpoint("GET", "/Asset/{assetId}"),
          endpoint("GET", "/Asset/GetByAssetNumber/{assetNumber}"),
          endpoint("POST", "/Asset/{actionedByContactId}"),
          endpoint("PUT", "/Asset/{assetId}/{actionedByContactId}"),
        ],
      },
      {
        id: "asset-reading",
        name: "Asset Readings",
        description: "Capture readings against assets.",
        endpoints: [endpoint("POST", "/AssetReading/{actionedByContactId}")],
      },
      {
        id: "bin-location",
        name: "Bin Locations",
        description: "Track physical bin locations.",
        endpoints: [
          endpoint("GET", "/BinLocation/GetAll"),
          endpoint("GET", "/BinLocation/{binLocationId}"),
          endpoint("GET", "/BinLocation/GetByBinLocationName/{name}"),
        ],
      },
      {
        id: "component-code",
        name: "Component Codes",
        description: "Standardize component identifiers and descriptions.",
        endpoints: [
          endpoint("GET", "/ComponentCode/GetAll"),
          endpoint("GET", "/ComponentCode/{componentCodeId}"),
          endpoint("GET", "/ComponentCode/GetByComponentCodeName/{name}"),
          endpoint("GET", "/ComponentCode/GetByComponentCodeDescription/{description}"),
        ],
      },
    ],
  },
  {
    id: "catalogue",
    name: "Catalogue & Inventory",
    description: "Catalogue records and transactional history.",
    modules: [
      {
        id: "catalogue",
        name: "Catalogue",
        description: "Manage catalogue items and numbers.",
        endpoints: [
          endpoint("GET", "/Catalogue/GetAll"),
          endpoint("GET", "/Catalogue/{catalogueId}"),
          endpoint("GET", "/Catalogue/GetByCatalogueNumber/{catalogueNumber}"),
          endpoint("POST", "/Catalogue/{actionedByContactId}"),
          endpoint("PUT", "/Catalogue/{catalogueId}/{actionedByContactId}"),
        ],
      },
      {
        id: "catalogue-transaction",
        name: "Catalogue Transactions",
        description: "Query catalogue activity by date range.",
        endpoints: [
          endpoint("GET", "/CatalogueTransaction/GetByDateRange/{dateFrom}/{dateTo}"),
        ],
      },
    ],
  },
  {
    id: "procurement",
    name: "Procurement",
    description: "Suppliers, purchasing, receipts, and approvals.",
    modules: [
      {
        id: "purchase-order",
        name: "Purchase Orders",
        description: "Purchase order lookup and approval workflow.",
        endpoints: [
          endpoint("GET", "/PurchaseOrder/GetAll"),
          endpoint("GET", "/PurchaseOrder/GetByPurchaseOrderNumber/{purchaseOrderNumber}"),
          endpoint(
            "GET",
            "/PurchaseOrder/GetByApprovalStatusAndDateRange/{approvalStatus}/{dateFrom}/{dateTo}",
          ),
          endpoint("PUT", "/PurchaseOrder/ApprovePurchaseOrder"),
          endpoint("PUT", "/PurchaseOrder/DeclinePurchaseOrder"),
        ],
      },
      {
        id: "goods-receipt",
        name: "Goods Receipts",
        description: "Track purchase order goods receipts.",
        endpoints: [
          endpoint("GET", "/GoodsReceipt/GetByPurchaseOrderNumber/{purchaseOrderNumber}"),
          endpoint("GET", "/GoodsReceipt/GetProcessedByDateRange/{dateFrom}/{dateTo}"),
          endpoint("POST", "/GoodsReceipt"),
        ],
      },
      {
        id: "supplier",
        name: "Suppliers",
        description: "Supplier lookup and record management.",
        endpoints: [
          endpoint("GET", "/Supplier/GetAll"),
          endpoint("GET", "/Supplier/{supplierId}"),
          endpoint("GET", "/Supplier/GetByCode/{code}"),
          endpoint("GET", "/Supplier/GetByCompany/{company}"),
          endpoint("POST", "/Supplier/{actionedByContactId}"),
          endpoint("PUT", "/Supplier/{supplierId}/{actionedByContactId}"),
        ],
      },
      {
        id: "supplier-invoice",
        name: "Supplier Invoices",
        description: "Supplier invoice creation and lookup.",
        endpoints: [
          endpoint("GET", "/SupplierInvoice/GetAll"),
          endpoint("GET", "/SupplierInvoice/{supplierInvoiceId}"),
          endpoint("GET", "/SupplierInvoice/GetByInvoiceNumber/{invoiceNumber}"),
          endpoint("POST", "/SupplierInvoice/{actionedByContactId}"),
          endpoint("PUT", "/SupplierInvoice/{supplierInvoiceId}/{actionedByContactId}"),
        ],
      },
      {
        id: "invoice-match",
        name: "Invoice Matching",
        description: "Match invoices to purchase orders.",
        endpoints: [
          endpoint("GET", "/InvoiceMatch/GetByPurchaseOrderNumber/{purchaseOrderNumber}"),
          endpoint("GET", "/InvoiceMatch/GetByDateRange/{dateFrom}/{dateTo}"),
        ],
      },
      {
        id: "request",
        name: "Requests",
        description: "Request lifecycle and description lookup.",
        endpoints: [
          endpoint("GET", "/Request/GetAll"),
          endpoint("GET", "/Request/{requestId}"),
          endpoint("GET", "/Request/GetByRequestNumber/{requestNumber}"),
          endpoint("GET", "/Request/GetByRequestDescription/{description}"),
          endpoint("POST", "/Request/{actionedByContactId}"),
          endpoint("PUT", "/Request/{requestId}/{actionedByContactId}"),
        ],
      },
      {
        id: "requisition",
        name: "Requisitions",
        description: "Requisition approvals and tracking.",
        endpoints: [
          endpoint("GET", "/Requisition/GetAll"),
          endpoint("GET", "/Requisition/{requisitionId}"),
          endpoint("GET", "/Requisition/GetByRequisitionNumber/{requisitionNumber}"),
          endpoint("PUT", "/Requisition/ApproveRequisition"),
          endpoint("PUT", "/Requisition/DeclineRequisition"),
        ],
      },
    ],
  },
  {
    id: "work-management",
    name: "Work Management",
    description: "Work order lifecycle, priorities, and job definitions.",
    modules: [
      {
        id: "work-order",
        name: "Work Orders",
        description: "Create, update, and query work orders.",
        endpoints: [
          endpoint("GET", "/WorkOrder/GetAll"),
          endpoint("GET", "/WorkOrder/{workOrderId}"),
          endpoint("GET", "/WorkOrder/GetByWorkOrderNumber/{workOrderNumber}"),
          endpoint("POST", "/WorkOrder/{actionedByContactId}"),
          endpoint("PUT", "/WorkOrder/{workOrderId}/{actionedByContactId}"),
        ],
      },
      {
        id: "standard-job",
        name: "Standard Jobs",
        description: "Raise work orders from standard jobs.",
        endpoints: [endpoint("POST", "/StandardJob/RaiseWorkOrder")],
      },
      {
        id: "job-type",
        name: "Job Types",
        description: "Job type and description lookups.",
        endpoints: [
          endpoint("GET", "/JobType/GetAll"),
          endpoint("GET", "/JobType/{jobTypeId}"),
          endpoint("GET", "/JobType/GetByJobTypeName/{name}"),
          endpoint("GET", "/JobType/GetByJobTypeDescription/{description}"),
        ],
      },
      {
        id: "priority",
        name: "Priorities",
        description: "Priority lookups by number or description.",
        endpoints: [
          endpoint("GET", "/Priority/GetAll"),
          endpoint("GET", "/Priority/{priorityId}"),
          endpoint("GET", "/Priority/GetByPriorityNumber/{priorityNumber}"),
          endpoint("GET", "/Priority/GetByPriorityDescription/{description}"),
        ],
      },
      {
        id: "work-order-spare",
        name: "Work Order Spares",
        description: "Spare parts associated with work orders.",
        endpoints: [
          endpoint("GET", "/WorkOrderSpare/GetAll"),
          endpoint("GET", "/WorkOrderSpare/{workOrderSpareId}"),
          endpoint("GET", "/WorkOrderSpare/GetByWorkOrderId/{workOrderId}"),
        ],
      },
      {
        id: "work-order-trade",
        name: "Work Order Trades",
        description: "Trades associated with work orders.",
        endpoints: [
          endpoint("GET", "/WorkOrderTrade/GetAll"),
          endpoint("GET", "/WorkOrderTrade/{workOrderTradeId}"),
          endpoint("GET", "/WorkOrderTrade/GetByWorkOrderId/{workOrderId}"),
        ],
      },
    ],
  },
  {
    id: "finance",
    name: "Finance",
    description: "Currency, tax, and trade code references.",
    modules: [
      {
        id: "currency-type",
        name: "Currency Types",
        description: "Currency type code and description lookup.",
        endpoints: [
          endpoint("GET", "/CurrencyType/GetAll"),
          endpoint("GET", "/CurrencyType/{currencyTypeId}"),
          endpoint("GET", "/CurrencyType/GetByCurrencyTypeCode/{code}"),
          endpoint("GET", "/CurrencyType/GetByCurrencyTypeDescription/{description}"),
          endpoint("POST", "/CurrencyType/{actionedByContactId}"),
          endpoint("PUT", "/CurrencyType/{currencyTypeId}/{actionedByContactId}"),
        ],
      },
      {
        id: "tax",
        name: "Taxes",
        description: "Tax definitions by name or description.",
        endpoints: [
          endpoint("GET", "/Tax/GetAll"),
          endpoint("GET", "/Tax/{taxId}"),
          endpoint("GET", "/Tax/GetByTaxName/{name}"),
          endpoint("GET", "/Tax/GetByTaxDescription/{description}"),
        ],
      },
      {
        id: "trade-code",
        name: "Trade Codes",
        description: "Trade code configuration and lookup.",
        endpoints: [
          endpoint("GET", "/TradeCode/GetAll"),
          endpoint("GET", "/TradeCode/{tradeCodeId}"),
          endpoint("GET", "/TradeCode/GetByTradeCodeName/{name}"),
          endpoint("POST", "/TradeCode/{actionedByContactId}"),
          endpoint("PUT", "/TradeCode/{tradeCodeId}/{actionedByContactId}"),
        ],
      },
    ],
  },
];

export const mexMaintenanceModules = mexMaintenanceCategories.flatMap(
  (category) => category.modules
);

export const getMexModuleById = (moduleId: string) =>
  mexMaintenanceModules.find((module) => module.id === moduleId) ?? null;

export const getMexCategoryByModuleId = (moduleId: string) =>
  mexMaintenanceCategories.find((category) =>
    category.modules.some((module) => module.id === moduleId)
  ) ?? null;
