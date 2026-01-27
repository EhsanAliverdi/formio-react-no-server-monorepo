import { useMemo } from "react";
import { DefaultMexHttpClient } from "../services/core/http";
import { AssetClient, AssetService } from "../services/modules/asset";
import { AssetReadingClient, AssetReadingService } from "../services/modules/asset-reading";
import { BinLocationClient, BinLocationService } from "../services/modules/bin-location";
import { CatalogueClient, CatalogueService } from "../services/modules/catalogue";
import {
  CatalogueTransactionClient,
  CatalogueTransactionService,
} from "../services/modules/catalogue-transaction";
import {
  ComponentCodeClient,
  ComponentCodeService,
} from "../services/modules/component-code";
import { ContactClient, ContactService } from "../services/modules/contact";
import { CurrencyTypeClient, CurrencyTypeService } from "../services/modules/currency-type";
import { DepartmentClient, DepartmentService } from "../services/modules/department";
import { DocumentClient, DocumentService } from "../services/modules/document";
import { EmployeeClient, EmployeeService } from "../services/modules/employee";
import { GoodsReceiptClient, GoodsReceiptService } from "../services/modules/goods-receipt";
import { JobTypeClient, JobTypeService } from "../services/modules/job-type";
import { PriorityClient, PriorityService } from "../services/modules/priority";
import { PurchaseOrderClient, PurchaseOrderService } from "../services/modules/purchase-order";
import { RequestClient, RequestService } from "../services/modules/request";
import { RequisitionClient, RequisitionService } from "../services/modules/requisition";
import { StandardJobClient, StandardJobService } from "../services/modules/standard-job";
import { SupplierClient, SupplierService } from "../services/modules/supplier";
import {
  SupplierInvoiceClient,
  SupplierInvoiceService,
} from "../services/modules/supplier-invoice";
import { TaxClient, TaxService } from "../services/modules/tax";
import { TradeCodeClient, TradeCodeService } from "../services/modules/trade-code";
import { WorkOrderClient, WorkOrderService } from "../services/modules/work-order";
import { WorkOrderSpareClient, WorkOrderSpareService } from "../services/modules/work-order-spare";
import { WorkOrderTradeClient, WorkOrderTradeService } from "../services/modules/work-order-trade";
import type { MexConfig } from "../services/core/config";
import { useMexMaintenanceConfig } from "./useMexMaintenanceConfig";

export type MexMaintenanceServices = {
  assets: AssetService;
  assetReadings: AssetReadingService;
  binLocations: BinLocationService;
  catalogue: CatalogueService;
  catalogueTransactions: CatalogueTransactionService;
  componentCodes: ComponentCodeService;
  contacts: ContactService;
  currencyTypes: CurrencyTypeService;
  departments: DepartmentService;
  documents: DocumentService;
  employees: EmployeeService;
  goodsReceipts: GoodsReceiptService;
  jobTypes: JobTypeService;
  priorities: PriorityService;
  purchaseOrders: PurchaseOrderService;
  requests: RequestService;
  requisitions: RequisitionService;
  standardJobs: StandardJobService;
  suppliers: SupplierService;
  supplierInvoices: SupplierInvoiceService;
  taxes: TaxService;
  tradeCodes: TradeCodeService;
  workOrders: WorkOrderService;
  workOrderSpares: WorkOrderSpareService;
  workOrderTrades: WorkOrderTradeService;
};

const buildServices = (config: MexConfig): MexMaintenanceServices => {
  const httpClient = new DefaultMexHttpClient(config);
  return {
    assets: new AssetService(new AssetClient(httpClient)),
    assetReadings: new AssetReadingService(new AssetReadingClient(httpClient)),
    binLocations: new BinLocationService(new BinLocationClient(httpClient)),
    catalogue: new CatalogueService(new CatalogueClient(httpClient)),
    catalogueTransactions: new CatalogueTransactionService(
      new CatalogueTransactionClient(httpClient)
    ),
    componentCodes: new ComponentCodeService(new ComponentCodeClient(httpClient)),
    contacts: new ContactService(new ContactClient(httpClient)),
    currencyTypes: new CurrencyTypeService(new CurrencyTypeClient(httpClient)),
    departments: new DepartmentService(new DepartmentClient(httpClient)),
    documents: new DocumentService(new DocumentClient(httpClient)),
    employees: new EmployeeService(new EmployeeClient(httpClient)),
    goodsReceipts: new GoodsReceiptService(new GoodsReceiptClient(httpClient)),
    jobTypes: new JobTypeService(new JobTypeClient(httpClient)),
    priorities: new PriorityService(new PriorityClient(httpClient)),
    purchaseOrders: new PurchaseOrderService(new PurchaseOrderClient(httpClient)),
    requests: new RequestService(new RequestClient(httpClient)),
    requisitions: new RequisitionService(new RequisitionClient(httpClient)),
    standardJobs: new StandardJobService(new StandardJobClient(httpClient)),
    suppliers: new SupplierService(new SupplierClient(httpClient)),
    supplierInvoices: new SupplierInvoiceService(new SupplierInvoiceClient(httpClient)),
    taxes: new TaxService(new TaxClient(httpClient)),
    tradeCodes: new TradeCodeService(new TradeCodeClient(httpClient)),
    workOrders: new WorkOrderService(new WorkOrderClient(httpClient)),
    workOrderSpares: new WorkOrderSpareService(new WorkOrderSpareClient(httpClient)),
    workOrderTrades: new WorkOrderTradeService(new WorkOrderTradeClient(httpClient)),
  };
};

export const useMexMaintenanceServices = () => {
  const { config, isReady } = useMexMaintenanceConfig();

  const services = useMemo(() => {
    if (!isReady) return null;
    return buildServices(config);
  }, [config, isReady]);

  return {
    config,
    isReady,
    services,
  };
};
