import MexMaintenanceWorkOrders from "../../shared/services/mex-maintenance/ui/MexMaintenanceWorkOrders";

export default function AdminMexWorkOrdersPage() {
  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
          MEX Work Orders
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Create, update, and browse work orders using the MEX Maintenance SDK.
        </p>
      </div>

      <MexMaintenanceWorkOrders />
    </div>
  );
}
