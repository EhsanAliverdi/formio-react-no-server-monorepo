import { Link, NavLink } from "react-router-dom";

function navLinkClassName({ isActive }: { isActive: boolean }) {
  return [
    "font-medium text-sm",
    isActive ? "text-blue-600" : "text-gray-700 hover:text-blue-600",
  ].join(" ");
}

export default function Navbar() {
  return (
    <header className="sticky top-0 inset-x-0 z-50 bg-white border-b border-gray-200">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3" aria-label="Main">
        <div className="flex flex-wrap items-center justify-between">
          <div className="flex items-center gap-x-3">
            <Link to="/" className="text-gray-900 font-semibold">
              FormIO
            </Link>
          </div>

          <div
            id="user-navbar-collapse"
            className="w-full overflow-hidden transition-all duration-300 basis-full grow sm:w-auto sm:basis-auto"
          >
            <div className="flex flex-col gap-y-2 mt-3 sm:mt-0 sm:flex-row sm:items-center sm:justify-end sm:gap-x-6">
              <NavLink to="/" end className={navLinkClassName}>
                Home
              </NavLink>
              <NavLink to="/forms" className={navLinkClassName}>
                Forms
              </NavLink>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
