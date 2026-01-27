import MexMaintenanceEmployees from "../../shared/services/mex-maintenance/ui/MexMaintenanceEmployees";

export default function AdminMexEmployeesPage() {
  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
          MEX Employees
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Manage MEX employee records used for work order actions.
        </p>
      </div>

      <MexMaintenanceEmployees />
    </div>
  );
}
