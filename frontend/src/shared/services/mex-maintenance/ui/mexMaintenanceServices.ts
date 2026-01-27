import { useMemo } from "react";
import { DefaultMexHttpClient } from "../core/http";
import { WorkOrderClient, WorkOrderService } from "../modules/work-order";
import { EmployeeClient, EmployeeService } from "../modules/employee";
import type { MexConfig } from "../core/config";
import { useMexMaintenanceConfig } from "./useMexMaintenanceConfig";

export type MexMaintenanceServices = {
  workOrders: WorkOrderService;
  employees: EmployeeService;
};

const buildServices = (config: MexConfig): MexMaintenanceServices => {
  const httpClient = new DefaultMexHttpClient(config);
  return {
    workOrders: new WorkOrderService(new WorkOrderClient(httpClient)),
    employees: new EmployeeService(new EmployeeClient(httpClient)),
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
