import { useMemo } from "react";
import { DefaultMexHttpClient } from "../core/http";
import { WorkOrderClient, WorkOrderService } from "../modules/work-order";
import { EmployeeClient, EmployeeService } from "../modules/employee";
import { JobTypeClient, JobTypeService } from "../modules/job-type";
import { WorkOrderSpareClient, WorkOrderSpareService } from "../modules/work-order-spare";
import { WorkOrderTradeClient, WorkOrderTradeService } from "../modules/work-order-trade";
import { StandardJobClient, StandardJobService } from "../modules/standard-job";
import type { MexConfig } from "../core/config";
import { useMexMaintenanceConfig } from "./useMexMaintenanceConfig";

export type MexMaintenanceServices = {
  workOrders: WorkOrderService;
  employees: EmployeeService;
  jobTypes: JobTypeService;
  workOrderSpares: WorkOrderSpareService;
  workOrderTrades: WorkOrderTradeService;
  standardJobs: StandardJobService;
};

const buildServices = (config: MexConfig): MexMaintenanceServices => {
  const httpClient = new DefaultMexHttpClient(config);
  return {
    workOrders: new WorkOrderService(new WorkOrderClient(httpClient)),
    employees: new EmployeeService(new EmployeeClient(httpClient)),
    jobTypes: new JobTypeService(new JobTypeClient(httpClient)),
    workOrderSpares: new WorkOrderSpareService(new WorkOrderSpareClient(httpClient)),
    workOrderTrades: new WorkOrderTradeService(new WorkOrderTradeClient(httpClient)),
    standardJobs: new StandardJobService(new StandardJobClient(httpClient)),
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
