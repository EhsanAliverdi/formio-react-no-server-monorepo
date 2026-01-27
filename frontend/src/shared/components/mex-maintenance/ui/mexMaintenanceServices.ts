import { useMemo } from "react";
import { DefaultMexHttpClient } from "../services/core/http";
import { WorkOrderClient, WorkOrderService } from "../services/modules/work-order";
import { EmployeeClient, EmployeeService } from "../services/modules/employee";
import { JobTypeClient, JobTypeService } from "../services/modules/job-type";
import { WorkOrderSpareClient, WorkOrderSpareService } from "../services/modules/work-order-spare";
import { WorkOrderTradeClient, WorkOrderTradeService } from "../services/modules/work-order-trade";
import { StandardJobClient, StandardJobService } from "../services/modules/standard-job";
import { ContactClient, ContactService } from "../services/modules/contact";
import { DepartmentClient, DepartmentService } from "../services/modules/department";
import type { MexConfig } from "../services/core/config";
import { useMexMaintenanceConfig } from "./useMexMaintenanceConfig";

export type MexMaintenanceServices = {
  workOrders: WorkOrderService;
  employees: EmployeeService;
  jobTypes: JobTypeService;
  workOrderSpares: WorkOrderSpareService;
  workOrderTrades: WorkOrderTradeService;
  standardJobs: StandardJobService;
  contacts: ContactService;
  departments: DepartmentService;
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
    contacts: new ContactService(new ContactClient(httpClient)),
    departments: new DepartmentService(new DepartmentClient(httpClient)),
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
