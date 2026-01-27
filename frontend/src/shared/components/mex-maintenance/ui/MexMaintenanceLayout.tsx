import { NavLink, Outlet } from "react-router-dom";
import { getMexMaintenanceSubmenus } from "./mexMaintenanceSubnav";
import { useMexMaintenanceConfig } from "./useMexMaintenanceConfig";

interface MexMaintenanceLayoutProps {
  basePath: string;
}

const linkClass = (isActive: boolean) =>
  `rounded-full px-4 py-2 text-sm font-medium transition ${
    isActive
      ? "bg-brand-600 text-white"
      : "border border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-300"
  }`;

export default function MexMaintenanceLayout({ basePath }: MexMaintenanceLayoutProps) {
  const submenus = getMexMaintenanceSubmenus(basePath);
  const { config } = useMexMaintenanceConfig();

  return (
    <div className="w-full space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
              Mex Maintenance
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Enterprise-grade maintenance operations for assets, procurement, and field teams.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <NavLink
              to={`${basePath}/settings`}
              className={({ isActive }) => linkClass(isActive)}
            >
              Settings
            </NavLink>
            {(config.showSdkHelp ?? true) && (
              <NavLink
                to={`${basePath}/sdk-help`}
                className={({ isActive }) => linkClass(isActive)}
              >
                SDK Help
              </NavLink>
            )}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {submenus.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) => linkClass(isActive)}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>

      <Outlet />
    </div>
  );
}
