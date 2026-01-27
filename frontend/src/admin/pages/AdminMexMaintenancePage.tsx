import { useParams } from "react-router-dom";
import {
  MexMaintenanceModuleDetails,
  MexMaintenanceOverview,
} from "../../shared/components/mex-maintenance";

export default function AdminMexMaintenancePage() {
  const { moduleId } = useParams();

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
          MEX Maintenance
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Track endpoint results in the overview and browse the SDK Help submenu for full API
          coverage.
        </p>
      </div>

      {moduleId ? (
        <MexMaintenanceModuleDetails moduleId={moduleId} basePath="/admin/mex" />
      ) : (
        <MexMaintenanceOverview basePath="/admin/mex" settingsPath="/admin/mex/settings" />
      )}
    </div>
  );
}
