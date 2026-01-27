import { MexMaintenanceOrganizationPeople } from "../../shared/components/mex-maintenance";

export default function AdminMexOrganizationPeoplePage() {
  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
          Organization &amp; People
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Search contacts, review departments, and manage employee records.
        </p>
      </div>

      <MexMaintenanceOrganizationPeople />
    </div>
  );
}
