import { MexMaintenanceWorkManagement } from "../../shared/components/mex-maintenance";

export default function AdminMexWorkManagementPage() {
  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
          MEX Work Management
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Manage job types, standard jobs, spares, and trades for work management.
        </p>
      </div>

      <MexMaintenanceWorkManagement />
    </div>
  );
}
