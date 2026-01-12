import { Link, useLocation } from "react-router-dom";
import Button from "../../template/tailAdmin/components/ui/button/Button";

type LocationState = {
  from?: string;
};

export default function NoAccessPage() {
  const location = useLocation();
  const state = (location.state ?? {}) as LocationState;

  return (
    <div className="w-full">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/3">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">No access</h1>
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          You don’t have permission to view this page.
          {state.from ? (
            <span className="block mt-1">Requested: <span className="font-medium">{state.from}</span></span>
          ) : null}
        </div>

        <div className="mt-5 flex items-center gap-2">
          <Link to="/">
            <Button size="sm">Back to home</Button>
          </Link>
          <Link to="/notifications">
            <Button size="sm" variant="outline">My notifications</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
