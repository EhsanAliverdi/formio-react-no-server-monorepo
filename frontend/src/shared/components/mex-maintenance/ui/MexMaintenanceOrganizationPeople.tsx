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
import type { ContactDTO } from "../services/modules/contact";
import type { DepartmentDTO } from "../services/modules/department";
import type { EmployeeDTO } from "../services/modules/employee";
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

export default function MexMaintenanceOrganizationPeople() {
  const { isReady, config, services } = useMexMaintenanceServices();
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employees, setEmployees] = useState<EmployeeDTO[]>([]);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeError, setEmployeeError] = useState<string | null>(null);
  const [employeeLookupId, setEmployeeLookupId] = useState("");
  const [employeeLookupResult, setEmployeeLookupResult] = useState<EmployeeDTO | null>(null);
  const [employeeActionedById, setEmployeeActionedById] = useState("");
  const [employeeMode, setEmployeeMode] = useState<"create" | "update">("create");
  const [employeeId, setEmployeeId] = useState("");
  const [employeeForm, setEmployeeForm] = useState<EmployeeDTO>(emptyEmployee);

  const [departments, setDepartments] = useState<DepartmentDTO[]>([]);
  const [departmentLoading, setDepartmentLoading] = useState(false);
  const [departmentError, setDepartmentError] = useState<string | null>(null);
  const [departmentLookupId, setDepartmentLookupId] = useState("");
  const [departmentLookupResult, setDepartmentLookupResult] = useState<DepartmentDTO | null>(null);

  const [contactUsername, setContactUsername] = useState("");
  const [contactFullName, setContactFullName] = useState("");
  const [contactResult, setContactResult] = useState<ContactDTO | null>(null);
  const [contactError, setContactError] = useState<string | null>(null);

  const employeeSummary = useMemo(() => {
    const total = employees.length;
    const active = employees.filter((employee) => employee.isActive).length;
    return { total, active };
  }, [employees]);

  const filteredEmployees = useMemo(() => {
    const term = employeeSearch.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter((employee) => {
      const values = [
        employee.employeeNumber,
        employee.fullName,
        employee.firstName,
        employee.lastName,
        employee.email,
        employee.phone,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return values.includes(term);
    });
  }, [employeeSearch, employees]);

  const loadEmployees = async () => {
    if (!services) return;
    setEmployeeLoading(true);
    setEmployeeError(null);
    try {
      const result = await services.employees.getAll();
      if (!result.ok) {
        setEmployeeError(result.error.message);
        return;
      }
      setEmployees(result.value ?? []);
    } finally {
      setEmployeeLoading(false);
    }
  };

  const loadDepartments = async () => {
    if (!services) return;
    setDepartmentLoading(true);
    setDepartmentError(null);
    try {
      const result = await services.departments.getAll();
      if (!result.ok) {
        setDepartmentError(result.error.message);
        return;
      }
      setDepartments(result.value ?? []);
    } finally {
      setDepartmentLoading(false);
    }
  };

  useEffect(() => {
    if (!isReady) return;
    void loadEmployees();
    void loadDepartments();
  }, [isReady]);

  const handleContactLookup = async (mode: "username" | "fullName") => {
    if (!services) return;
    setContactError(null);
    setContactResult(null);
    if (mode === "username") {
      if (!contactUsername.trim()) {
        setContactError("Enter a username to search.");
        return;
      }
      const result = await services.contacts.getByUsername(contactUsername.trim());
      if (!result.ok) {
        setContactError(result.error.message);
        return;
      }
      setContactResult(result.value ?? null);
      return;
    }

    if (!contactFullName.trim()) {
      setContactError("Enter a full name to search.");
      return;
    }
    const result = await services.contacts.getByFullName(contactFullName.trim());
    if (!result.ok) {
      setContactError(result.error.message);
      return;
    }
    setContactResult(result.value ?? null);
  };

  const handleDepartmentLookup = async () => {
    if (!services) return;
    if (!departmentLookupId.trim()) {
      setDepartmentError("Enter a department ID to search.");
      return;
    }
    setDepartmentError(null);
    const result = await services.departments.getById(Number(departmentLookupId));
    if (!result.ok) {
      setDepartmentError(result.error.message);
      setDepartmentLookupResult(null);
      return;
    }
    setDepartmentLookupResult(result.value ?? null);
  };

  const handleEmployeeLookup = async () => {
    if (!services) return;
    if (!employeeLookupId.trim()) {
      setEmployeeError("Enter an employee ID to search.");
      return;
    }
    setEmployeeError(null);
    const result = await services.employees.getById(Number(employeeLookupId));
    if (!result.ok) {
      setEmployeeError(result.error.message);
      setEmployeeLookupResult(null);
      return;
    }
    setEmployeeLookupResult(result.value ?? null);
  };

  const handleEmployeeSubmit = async () => {
    if (!services) return;
    if (!employeeActionedById.trim()) {
      setEmployeeError("Actioned by contact ID is required.");
      return;
    }
    const actionedId = Number(employeeActionedById);
    if (!Number.isFinite(actionedId)) {
      setEmployeeError("Actioned by contact ID must be a number.");
      return;
    }

    setEmployeeLoading(true);
    setEmployeeError(null);
    const payload: EmployeeDTO = {
      ...employeeForm,
      isActive: Boolean(employeeForm.isActive),
    };

    try {
      if (employeeMode === "create") {
        const result = await services.employees.create(actionedId, payload);
        if (!result.ok) {
          setEmployeeError(result.error.message);
          return;
        }
      } else {
        if (!employeeId.trim()) {
          setEmployeeError("Employee ID is required for updates.");
          return;
        }
        const result = await services.employees.update(
          Number(employeeId),
          actionedId,
          payload
        );
        if (!result.ok) {
          setEmployeeError(result.error.message);
          return;
        }
      }

      setEmployeeForm(emptyEmployee);
      setEmployeeId("");
      await loadEmployees();
    } finally {
      setEmployeeLoading(false);
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
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Employees", value: employeeSummary.total },
          { label: "Active employees", value: employeeSummary.active },
          { label: "Departments", value: departments.length },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3"
          >
            <div className="text-xs uppercase tracking-wide text-gray-400">
              {card.label}
            </div>
            <div className="mt-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
              {employeeLoading || departmentLoading ? "…" : card.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
            Contact lookup
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Search for contacts by username or full name.
          </p>

          {contactError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-200">
              {contactError}
            </div>
          )}

          <div className="mt-4 grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="mexContactUsername">Username</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="mexContactUsername"
                  type="text"
                  placeholder="jane.doe"
                  value={contactUsername}
                  onChange={(e) => setContactUsername(e.target.value)}
                />
                <Button variant="outline" onClick={() => handleContactLookup("username")}>
                  Search
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mexContactFullName">Full name</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="mexContactFullName"
                  type="text"
                  placeholder="Jane Doe"
                  value={contactFullName}
                  onChange={(e) => setContactFullName(e.target.value)}
                />
                <Button variant="outline" onClick={() => handleContactLookup("fullName")}>
                  Search
                </Button>
              </div>
            </div>
          </div>

          {contactResult && (
            <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-200">
              <div className="font-semibold text-gray-800 dark:text-white/90">
                {contactResult.fullName ?? contactResult.username ?? "Contact"}
              </div>
              <div className="mt-2 grid gap-2 text-xs text-gray-500 dark:text-gray-400">
                <div>Username: {contactResult.username ?? "—"}</div>
                <div>Email: {contactResult.email ?? "—"}</div>
                <div>Active: {contactResult.isActive ? "Yes" : "No"}</div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
                Departments
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Review departments and pull a specific record by ID.
              </p>
            </div>
            <Button variant="outline" onClick={loadDepartments} disabled={departmentLoading}>
              {departmentLoading ? "Refreshing…" : "Refresh"}
            </Button>
          </div>

          {departmentError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-200">
              {departmentError}
            </div>
          )}

          <div className="mt-4 space-y-2">
            <Label htmlFor="mexDepartmentId">Department ID</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="mexDepartmentId"
                type="number"
                placeholder="42"
                value={departmentLookupId}
                onChange={(e) => setDepartmentLookupId(e.target.value)}
              />
              <Button variant="outline" onClick={handleDepartmentLookup}>
                Fetch
              </Button>
            </div>
          </div>

          {departmentLookupResult && (
            <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-200">
              <div className="font-semibold text-gray-800 dark:text-white/90">
                {departmentLookupResult.departmentName ?? "Department"}
              </div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Department ID: {departmentLookupResult.departmentId ?? "—"}
              </div>
            </div>
          )}

          <div className="mt-4 overflow-x-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-200 text-left text-xs uppercase text-gray-400">
                  <TableCell isHeader className="pb-2">
                    ID
                  </TableCell>
                  <TableCell isHeader className="pb-2">
                    Name
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.length === 0 ? (
                  <TableRow>
                    <td className="py-4 text-gray-500" colSpan={2}>
                      {departmentLoading ? "Loading departments…" : "No departments returned yet."}
                    </td>
                  </TableRow>
                ) : (
                  departments.map((department) => (
                    <TableRow
                      key={department.departmentId ?? department.departmentName ?? Math.random()}
                    >
                      <TableCell className="py-3 font-medium text-gray-800 dark:text-white/90">
                        {department.departmentId ?? "—"}
                      </TableCell>
                      <TableCell className="py-3 text-gray-600 dark:text-gray-300">
                        {department.departmentName ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
              Employees
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Search, create, and update employee records from MEX Maintenance.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={employeeMode === "create" ? "primary" : "outline"}
              onClick={() => setEmployeeMode("create")}
            >
              Create employee
            </Button>
            <Button
              variant={employeeMode === "update" ? "primary" : "outline"}
              onClick={() => setEmployeeMode("update")}
            >
              Update employee
            </Button>
            <Button variant="outline" onClick={loadEmployees} disabled={employeeLoading}>
              {employeeLoading ? "Refreshing…" : "Refresh"}
            </Button>
          </div>
        </div>

        {employeeError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-200">
            {employeeError}
          </div>
        )}

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1">
            <Label htmlFor="mexEmployeeSearch">Search employees</Label>
            <Input
              id="mexEmployeeSearch"
              type="text"
              placeholder="Search by name, number, email, or phone"
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="mexEmployeeLookupId">Employee ID</Label>
              <Input
                id="mexEmployeeLookupId"
                type="number"
                placeholder="987"
                value={employeeLookupId}
                onChange={(e) => setEmployeeLookupId(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={handleEmployeeLookup}>
              Fetch by ID
            </Button>
          </div>
        </div>

        {employeeLookupResult && (
          <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-200">
            <div className="font-semibold text-gray-800 dark:text-white/90">
              {employeeLookupResult.fullName ??
                employeeLookupResult.employeeNumber ??
                "Employee"}
            </div>
            <div className="mt-2 grid gap-2 text-xs text-gray-500 dark:text-gray-400">
              <div>Email: {employeeLookupResult.email ?? "—"}</div>
              <div>Phone: {employeeLookupResult.phone ?? "—"}</div>
              <div>Active: {employeeLookupResult.isActive ? "Yes" : "No"}</div>
            </div>
          </div>
        )}

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
              {filteredEmployees.length === 0 ? (
                <TableRow>
                  <td className="py-4 text-gray-500" colSpan={5}>
                    {employeeLoading
                      ? "Loading employees…"
                      : "No employees match your search."}
                  </td>
                </TableRow>
              ) : (
                filteredEmployees.map((employee) => (
                  <TableRow key={employee.employeeId ?? employee.employeeNumber ?? Math.random()}>
                    <TableCell className="py-3 font-medium text-gray-800 dark:text-white/90">
                      {employee.employeeNumber ?? employee.employeeId ?? "—"}
                    </TableCell>
                    <TableCell className="py-3 text-gray-600 dark:text-gray-300">
                      {employee.fullName ||
                        `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim() ||
                        "—"}
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

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
        <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
          {employeeMode === "create" ? "Create employee" : "Update employee"}
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Use the actioned-by contact ID to submit employee updates.
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="mexEmployeeActioned">Actioned by contact ID</Label>
            <Input
              id="mexEmployeeActioned"
              type="number"
              placeholder="Employee/Contact ID"
              value={employeeActionedById}
              onChange={(e) => setEmployeeActionedById(e.target.value)}
            />
          </div>

          {employeeMode === "update" && (
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
            <Label htmlFor="mexEmployeeNumber">Employee number</Label>
            <Input
              id="mexEmployeeNumber"
              type="text"
              placeholder="EMP-001"
              value={employeeForm.employeeNumber ?? ""}
              onChange={(e) =>
                setEmployeeForm((prev) => ({
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
              value={employeeForm.email ?? ""}
              onChange={(e) =>
                setEmployeeForm((prev) => ({
                  ...prev,
                  email: e.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mexEmployeeFirstName">First name</Label>
            <Input
              id="mexEmployeeFirstName"
              type="text"
              placeholder="Jane"
              value={employeeForm.firstName ?? ""}
              onChange={(e) =>
                setEmployeeForm((prev) => ({
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
              value={employeeForm.lastName ?? ""}
              onChange={(e) =>
                setEmployeeForm((prev) => ({
                  ...prev,
                  lastName: e.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mexEmployeePhone">Phone</Label>
            <Input
              id="mexEmployeePhone"
              type="text"
              placeholder="+61 400 000 000"
              value={employeeForm.phone ?? ""}
              onChange={(e) =>
                setEmployeeForm((prev) => ({
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
              checked={Boolean(employeeForm.isActive)}
              onChange={(e) =>
                setEmployeeForm((prev) => ({
                  ...prev,
                  isActive: e.target.checked,
                }))
              }
            />
            <Label htmlFor="mexEmployeeActive">Active employee</Label>
          </div>

          <div className="lg:col-span-2">
            <Button onClick={handleEmployeeSubmit} disabled={employeeLoading}>
              {employeeLoading
                ? "Saving…"
                : employeeMode === "create"
                ? "Create employee"
                : "Update employee"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
