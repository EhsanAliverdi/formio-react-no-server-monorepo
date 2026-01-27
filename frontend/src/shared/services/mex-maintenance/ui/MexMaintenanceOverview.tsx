import { Link } from "react-router-dom";
import { mexMaintenanceCategories } from "./mexMaintenanceCatalog";

interface MexMaintenanceOverviewProps {
  basePath: string;
  settingsPath: string;
}

export default function MexMaintenanceOverview({
  basePath,
  settingsPath,
}: MexMaintenanceOverviewProps) {
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
                <div
                  key={module.id}
                  className="flex flex-col gap-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        to={`${basePath}/${module.id}`}
                        className="text-sm font-semibold text-gray-800 hover:text-brand-600 dark:text-white/90"
                      >
                        {module.name}
                      </Link>
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                        {module.description}
                      </p>
                    </div>
                    <span className="rounded-full bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
                      {module.endpoints.length} endpoints
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {module.endpoints.map((endpoint, index) => (
                      <span key={`${module.id}-${endpoint.method}-${endpoint.path}`}>
                        {endpoint.method} {endpoint.path}
                        {index < module.endpoints.length - 1 ? ", " : ""}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
