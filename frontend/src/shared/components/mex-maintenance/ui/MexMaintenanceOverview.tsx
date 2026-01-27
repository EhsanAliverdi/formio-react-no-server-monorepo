import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { mexMaintenanceCategories } from "./mexMaintenanceCatalog";
import { getMexMaintenanceMenu } from "./mexMaintenanceNavigation";
import { useMexMaintenanceServices } from "./mexMaintenanceServices";

interface MexMaintenanceOverviewProps {
  basePath: string;
  settingsPath: string;
}

export default function MexMaintenanceOverview({
  basePath,
  settingsPath,
}: MexMaintenanceOverviewProps) {
  const { isReady, services } = useMexMaintenanceServices();
  const menuSections = getMexMaintenanceMenu(basePath);
  const [workOrderCount, setWorkOrderCount] = useState<number | null>(null);
  const [employeeCount, setEmployeeCount] = useState<number | null>(null);

  useEffect(() => {
    if (!isReady || !services) return;

    const loadSummary = async () => {
      const [workOrdersResult, employeesResult] = await Promise.all([
        services.workOrders.getAll(),
        services.employees.getAll(),
      ]);

      if (workOrdersResult.ok) {
        setWorkOrderCount(workOrdersResult.value?.length ?? 0);
      }

      if (employeesResult.ok) {
        setEmployeeCount(employeesResult.value?.length ?? 0);
      }
    };

    void loadSummary();
  }, [isReady, services]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              MEX Maintenance overview
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Browse every MEX endpoint by domain and jump directly to a module for implementation
              guidance.
            </p>
          </div>
          <Link
            to={settingsPath}
            className="inline-flex items-center justify-center rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-200"
          >
            Configure authentication
          </Link>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {menuSections.map((section) => (
          <div
            key={section.id}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3"
          >
            <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
              {section.label}
            </h3>
            <div className="mt-4 space-y-3">
              {section.items.map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700 transition hover:border-brand-200 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-200"
                >
                  <span>{item.label}</span>
                  {item.id === "work-orders" && workOrderCount !== null ? (
                    <span className="text-xs text-gray-500">{workOrderCount} total</span>
                  ) : null}
                  {item.id === "employees" && employeeCount !== null ? (
                    <span className="text-xs text-gray-500">{employeeCount} total</span>
                  ) : null}
                </Link>
              ))}
            </div>
          </div>
        ))}

        {mexMaintenanceCategories.map((category) => (
          <div
            key={category.id}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3"
          >
            <div>
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                {category.name}
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {category.description}
              </p>
            </div>
            <div className="mt-4 space-y-3">
              {category.modules.map((module) => (
                <Link
                  key={module.id}
                  to={`${basePath}/${module.id}`}
                  className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700 transition hover:border-brand-200 hover:text-brand-600 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-200"
                >
                  <span className="font-semibold">{module.name}</span>
                  <span className="text-xs text-gray-500">{module.description}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
