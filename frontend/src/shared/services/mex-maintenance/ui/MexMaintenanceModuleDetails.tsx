import { Link } from "react-router-dom";
import {
  getMexCategoryByModuleId,
  getMexModuleById,
} from "./mexMaintenanceCatalog";

interface MexMaintenanceModuleDetailsProps {
  moduleId: string;
  basePath: string;
}

export default function MexMaintenanceModuleDetails({
  moduleId,
  basePath,
}: MexMaintenanceModuleDetailsProps) {
  const module = getMexModuleById(moduleId);
  const category = getMexCategoryByModuleId(moduleId);

  if (!module) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-200">
        The requested MEX module could not be found.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            {module.name}
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {module.description}
          </p>
          {category && (
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-gray-400">
              {category.name}
            </p>
          )}
        </div>
        <Link
          to={basePath}
          className="text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          Back to overview
        </Link>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
          Available endpoints
        </h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          These are the endpoint routes exposed by the MEX SDK for this module.
        </p>
        <div className="mt-4 space-y-3">
          {module.endpoints.map((endpoint) => (
            <div
              key={`${module.id}-${endpoint.method}-${endpoint.path}`}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-200"
            >
              <span className="rounded-full bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
                {endpoint.method}
              </span>
              <span className="font-mono text-xs">{endpoint.path}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
