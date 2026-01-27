import { MexMaintenanceSettingsForm } from "../../shared/components/mex-maintenance";

export default function AdminMexSettingsPage() {
  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
          MEX Settings
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Configure authentication and connectivity for the MEX Maintenance SDK.
        </p>
      </div>

      <MexMaintenanceSettingsForm />
    </div>
  );
}
