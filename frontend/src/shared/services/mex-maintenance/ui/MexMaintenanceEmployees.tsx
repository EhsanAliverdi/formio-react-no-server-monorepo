import { useEffect, useMemo, useState } from "react";
import Button from "../../../../template/tailAdmin/components/ui/button/Button";
import Input from "../../../../template/tailAdmin/components/form/input/InputField";
import Label from "../../../../template/tailAdmin/components/form/Label";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../../../template/tailAdmin/components/ui/table";
import type { EmployeeDTO } from "../modules/employee";
import { useMexMaintenanceServices } from "./mexMaintenanceServices";

const emptyEmployee: EmployeeDTO = {
  employeeNumber: "",
  firstName: "",
  lastName: "",
  fullName: "",
  email: "",
  phone: "",
  isActive: true,
};

export default function MexMaintenanceEmployees() {
  const { isReady, config, services } = useMexMaintenanceServices();
  const [employees, setEmployees] = useState<EmployeeDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lookupId, setLookupId] = useState("");
  const [lookupResult, setLookupResult] = useState<EmployeeDTO | null>(null);
  const [actionedByContactId, setActionedByContactId] = useState("");
  const [mode, setMode] = useState<"create" | "update">("create");
  const [employeeId, setEmployeeId] = useState("");
  const [formState, setFormState] = useState<EmployeeDTO>(emptyEmployee);

  const summary = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((employee) => employee.isActive).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [employees]);

  const loadAll = async () => {
    if (!services) return;
    setLoading(true);
    setError(null);
    try {
      const result = await services.employees.getAll();
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setEmployees(result.value ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady) return;
    void loadAll();
    setLookupResult(null);
  }, [isReady]);

  const handleLookupById = async () => {
    if (!services) return;
    if (!lookupId.trim()) {
      setError("Enter an employee ID to search.");
      return;
    }
    setError(null);
    const result = await services.employees.getById(Number(lookupId));
    if (!result.ok) {
      setError(result.error.message);
      setLookupResult(null);
      return;
    }
    setLookupResult(result.value ?? null);
  };

  const handleSubmit = async () => {
    if (!services) return;
    if (!actionedByContactId.trim()) {
      setError("Actioned by contact ID is required.");
      return;
    }
    const actionedId = Number(actionedByContactId);
    if (!Number.isFinite(actionedId)) {
      setError("Actioned by contact ID must be a number.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload: EmployeeDTO = {
      ...formState,
      isActive: Boolean(formState.isActive),
    };

    try {
      if (mode === "create") {
        const result = await services.employees.create(actionedId, payload);
        if (!result.ok) {
          setError(result.error.message);
          return;
        }
      } else {
        if (!employeeId.trim()) {
          setError("Employee ID is required for updates.");
          return;
        }
        const result = await services.employees.update(
          Number(employeeId),
          actionedId,
          payload
        );
        if (!result.ok) {
          setError(result.error.message);
          return;
        }
      }

      setFormState(emptyEmployee);
      setEmployeeId("");
      await loadAll();
    } finally {
      setSaving(false);
    }
  };

  if (!isReady) {
    return (
      <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-6 text-sm text-yellow-900 dark:border-yellow-900/60 dark:bg-yellow-900/20 dark:text-yellow-100">
        Configure the MEX base URL and authentication first. Current base URL: {config.baseUrl || "not set"}.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Total employees", value: summary.total },
          { label: "Active", value: summary.active },
          { label: "Inactive", value: summary.inactive },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3"
          >
            <div className="text-xs uppercase tracking-wide text-gray-400">
              {card.label}
            </div>
            <div className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              {loading ? "…" : card.value}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
              Employee directory
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Browse employee records returned from the MEX Maintenance API.
            </p>
          </div>
          <Button variant="outline" onClick={loadAll} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </Button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <Table className="text-sm">
            <TableHeader>
              <TableRow className="border-b border-gray-200 text-left text-xs uppercase text-gray-400">
                <TableCell isHeader className="pb-2">
                  Employee #
                </TableCell>
                <TableCell isHeader className="pb-2">
                  Name
                </TableCell>
                <TableCell isHeader className="pb-2">
                  Email
                </TableCell>
                <TableCell isHeader className="pb-2">
                  Phone
                </TableCell>
                <TableCell isHeader className="pb-2">
                  Active
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.length === 0 ? (
                <TableRow>
                  <td className="py-4 text-gray-500" colSpan={5}>
                    {loading ? "Loading employees…" : "No employees returned yet."}
                  </td>
                </TableRow>
              ) : (
                employees.map((employee) => (
                  <TableRow key={employee.employeeId ?? employee.employeeNumber ?? Math.random()}>
                    <TableCell className="py-3 font-medium text-gray-800 dark:text-white/90">
                      {employee.employeeNumber ?? employee.employeeId ?? "—"}
                    </TableCell>
                    <TableCell className="py-3 text-gray-600 dark:text-gray-300">
                      {employee.fullName || `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim() || "—"}
                    </TableCell>
                    <TableCell className="py-3 text-gray-600 dark:text-gray-300">
                      {employee.email ?? "—"}
                    </TableCell>
                    <TableCell className="py-3 text-gray-600 dark:text-gray-300">
                      {employee.phone ?? "—"}
                    </TableCell>
                    <TableCell className="py-3 text-gray-600 dark:text-gray-300">
                      {employee.isActive ? "Yes" : "No"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
            Lookup employee
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Pull a single employee record by ID using the SDK.
          </p>

          <div className="mt-4 space-y-2">
            <Label htmlFor="mexEmployeeId">Employee ID</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="mexEmployeeId"
                type="number"
                placeholder="987"
                value={lookupId}
                onChange={(e) => setLookupId(e.target.value)}
              />
              <Button variant="outline" onClick={handleLookupById}>
                Fetch employee
              </Button>
            </div>
          </div>

          {lookupResult && (
            <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-200">
              <div className="font-semibold text-gray-800 dark:text-white/90">
                {lookupResult.fullName ?? lookupResult.employeeNumber ?? "Employee"}
              </div>
              <div className="mt-2 grid gap-2 text-xs text-gray-500 dark:text-gray-400">
                <div>Email: {lookupResult.email ?? "—"}</div>
                <div>Phone: {lookupResult.phone ?? "—"}</div>
                <div>Active: {lookupResult.isActive ? "Yes" : "No"}</div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
            {mode === "create" ? "Create employee" : "Update employee"}
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Use an actioned-by employee/contact ID to manage employee records.
          </p>

          <div className="mt-4 grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="mexEmployeeMode">Mode</Label>
              <div className="flex flex-wrap gap-2">
                {(["create", "update"] as const).map((value) => (
                  <Button
                    key={value}
                    variant={mode === value ? "primary" : "outline"}
                    onClick={() => setMode(value)}
                  >
                    {value === "create" ? "Create" : "Update"}
                  </Button>
                ))}
              </div>
            </div>

            {mode === "update" && (
              <div className="space-y-2">
                <Label htmlFor="mexEmployeeUpdateId">Employee ID</Label>
                <Input
                  id="mexEmployeeUpdateId"
                  type="number"
                  placeholder="987"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="mexEmployeeActioned">Actioned by contact ID</Label>
              <Input
                id="mexEmployeeActioned"
                type="number"
                placeholder="Employee/Contact ID"
                value={actionedByContactId}
                onChange={(e) => setActionedByContactId(e.target.value)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mexEmployeeNumber">Employee number</Label>
                <Input
                  id="mexEmployeeNumber"
                  type="text"
                  placeholder="EMP-001"
                  value={formState.employeeNumber ?? ""}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      employeeNumber: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mexEmployeeEmail">Email</Label>
                <Input
                  id="mexEmployeeEmail"
                  type="email"
                  placeholder="employee@example.com"
                  value={formState.email ?? ""}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      email: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mexEmployeeFirstName">First name</Label>
                <Input
                  id="mexEmployeeFirstName"
                  type="text"
                  placeholder="Jane"
                  value={formState.firstName ?? ""}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      firstName: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mexEmployeeLastName">Last name</Label>
                <Input
                  id="mexEmployeeLastName"
                  type="text"
                  placeholder="Doe"
                  value={formState.lastName ?? ""}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      lastName: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mexEmployeePhone">Phone</Label>
              <Input
                id="mexEmployeePhone"
                type="text"
                placeholder="+61 400 000 000"
                value={formState.phone ?? ""}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    phone: e.target.value,
                  }))
                }
              />
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input
                id="mexEmployeeActive"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
                checked={Boolean(formState.isActive)}
                onChange={(e) =>
                  setFormState((prev) => ({
                    ...prev,
                    isActive: e.target.checked,
                  }))
                }
              />
              <Label htmlFor="mexEmployeeActive">Active employee</Label>
            </div>

            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Saving…" : mode === "create" ? "Create employee" : "Update employee"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
