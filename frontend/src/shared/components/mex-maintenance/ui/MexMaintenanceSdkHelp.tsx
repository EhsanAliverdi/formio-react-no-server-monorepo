import { Link } from "react-router-dom";
import { mexMaintenanceCategories } from "./mexMaintenanceCatalog";

interface MexMaintenanceSdkHelpProps {
  basePath: string;
}

export default function MexMaintenanceSdkHelp({ basePath }: MexMaintenanceSdkHelpProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">SDK Help</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Complete reference for every MEX Maintenance SDK module and endpoint.
        </p>
      </div>

      <div className="space-y-6">
        {mexMaintenanceCategories.map((category) => (
          <div
            key={category.id}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3"
          >
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
                {category.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{category.description}</p>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {category.modules.map((module) => (
                <div
                  key={module.id}
                  className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900/30 dark:text-gray-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white/90">
                        {module.name}
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {module.description}
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs text-gray-500 shadow-sm dark:bg-gray-800 dark:text-gray-300">
                      {module.endpoints.length} endpoints
                    </span>
                  </div>
                  <div className="mt-3 space-y-1 text-xs text-gray-500 dark:text-gray-400">
                    {module.endpoints.map((endpoint) => (
                      <div key={`${module.id}-${endpoint.method}-${endpoint.path}`}>
                        <span className="font-semibold text-gray-600 dark:text-gray-300">
                          {endpoint.method}
                        </span>{" "}
                        {endpoint.path}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3">
                    <Link
                      to={`${basePath}/sdk-help/${module.id}`}
                      className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                    >
                      View module details
                    </Link>
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
