import { NavLink, Outlet } from "react-router-dom";

function tabClassName({ isActive }: { isActive: boolean }) {
  return [
    "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
    isActive
      ? "bg-brand-500 text-white"
      : "text-gray-700 hover:bg-gray-100",
  ].join(" ");
}

export default function FormsLayoutPage() {
  return (
    <div className="w-full">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Forms</h1>
      </div>

      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-2">
          <NavLink to="/forms" end className={tabClassName}>
            Fill form
          </NavLink>
          <NavLink to="/forms/mysubmissions" className={tabClassName}>
            My submissions
          </NavLink>
        </div>
      </div>

      <Outlet />
    </div>
  );
}
