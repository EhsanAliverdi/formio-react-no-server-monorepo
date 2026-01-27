import { useEffect, useMemo, useState } from "react";
import Button from "../../../../template/tailAdmin/components/ui/button/Button";
import Input from "../../../../template/tailAdmin/components/form/input/InputField";
import Label from "../../../../template/tailAdmin/components/form/Label";
import MexMaintenanceDrawer from "./MexMaintenanceDrawer";
import type { DepartmentDTO } from "../services/modules/department";
import type { RequisitionDTO } from "../services/modules/requisition";
import { useMexMaintenanceServices } from "./mexMaintenanceServices";

const formatDate = (value?: string) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
};

export default function MexMaintenanceRequisitions() {
  const { isReady, config, services } = useMexMaintenanceServices();
  const [requisitions, setRequisitions] = useState<RequisitionDTO[]>([]);
  const [departments, setDepartments] = useState<DepartmentDTO[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "decline">("approve");
  const [selectedReq, setSelectedReq] = useState<RequisitionDTO | null>(null);
  const [comments, setComments] = useState("");

  const loadRequisitions = async () => {
    if (!services) return;
    const [reqResult, deptResult] = await Promise.all([
      services.requisitions.getAll(),
      services.departments.getAll(),
    ]);
    if (!reqResult.ok) {
      setError(reqResult.error.message);
      return;
    }
    if (!deptResult.ok) {
      setError(deptResult.error.message);
      return;
    }
    setRequisitions(reqResult.value ?? []);
    setDepartments(deptResult.value ?? []);
  };

  useEffect(() => {
    if (!isReady || !services) return;
    setError(null);
    void loadRequisitions();
  }, [isReady, services]);

  const departmentLookup = useMemo(() => {
    return departments.reduce<Record<string, string>>((acc, dept) => {
      if (dept.departmentId) {
        acc[String(dept.departmentId)] = dept.departmentName ?? `Department ${dept.departmentId}`;
      }
      return acc;
    }, {});
  }, [departments]);

  const openAction = (req: RequisitionDTO, type: "approve" | "decline") => {
    setSelectedReq(req);
    setActionType(type);
    setComments("");
    setDrawerOpen(true);
  };

  const submitAction = async () => {
    if (!services || !selectedReq?.requisitionId) return;
    const action = { requisitionId: selectedReq.requisitionId, comments: comments || undefined };
    const result =
      actionType === "approve"
        ? await services.requisitions.approve(action)
        : await services.requisitions.decline(action);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setDrawerOpen(false);
    await loadRequisitions();
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
      <div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Requisitions</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Review requisitions and process approval decisions.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/3">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800/40 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3 text-left">Requisition Number</th>
              <th className="px-4 py-3 text-left">Department</th>
              <th className="px-4 py-3 text-left">Requested By</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Required Date</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {requisitions.map((req) => (
              <tr key={req.requisitionId ?? req.requisitionNumber} className="text-gray-700 dark:text-gray-200">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white/90">
                  {req.requisitionNumber ?? "—"}
                </td>
                <td className="px-4 py-3">
                  {req.departmentId ? departmentLookup[String(req.departmentId)] : "—"}
                </td>
                <td className="px-4 py-3">{req.requestedBy ?? "—"}</td>
                <td className="px-4 py-3">{req.approvalStatus ?? req.status ?? "Pending"}</td>
                <td className="px-4 py-3">{formatDate(req.requiredDate)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => openAction(req, "approve")}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openAction(req, "decline")}>
                      Decline
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {requisitions.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>
                  No requisitions returned from the SDK.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <MexMaintenanceDrawer
        isOpen={drawerOpen}
        title={`${actionType === "approve" ? "Approve" : "Decline"} requisition`}
        onClose={() => setDrawerOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" size="sm" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={submitAction}>
              {actionType === "approve" ? "Approve" : "Decline"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900/30 dark:text-gray-200">
            <div className="font-semibold text-gray-800 dark:text-white/90">
              {selectedReq?.requisitionNumber ?? "Requisition"}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Required by {formatDate(selectedReq?.requiredDate)}
            </div>
          </div>
          <div>
            <Label>Comments (optional)</Label>
            <Input value={comments} onChange={(event) => setComments(event.target.value)} />
          </div>
        </div>
      </MexMaintenanceDrawer>
    </div>
  );
}
