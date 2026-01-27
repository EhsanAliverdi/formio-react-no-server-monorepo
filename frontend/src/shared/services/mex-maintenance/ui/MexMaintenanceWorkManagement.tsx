import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
import type { JobTypeDTO } from "../modules/job-type";
import type { WorkOrderSpareDTO } from "../modules/work-order-spare";
import type { WorkOrderTradeDTO } from "../modules/work-order-trade";
import type { StandardJobActionDTO } from "../modules/standard-job";
import { useMexMaintenanceServices } from "./mexMaintenanceServices";

export default function MexMaintenanceWorkManagement() {
  const { isReady, config, services } = useMexMaintenanceServices();
  const [jobTypes, setJobTypes] = useState<JobTypeDTO[]>([]);
  const [workOrderSpares, setWorkOrderSpares] = useState<WorkOrderSpareDTO[]>([]);
  const [workOrderTrades, setWorkOrderTrades] = useState<WorkOrderTradeDTO[]>([]);
  const [selectedJobType, setSelectedJobType] = useState<JobTypeDTO | null>(null);
  const [selectedSpare, setSelectedSpare] = useState<WorkOrderSpareDTO | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<WorkOrderTradeDTO | null>(null);
  const [jobTypeSearch, setJobTypeSearch] = useState("");
  const [spareSearch, setSpareSearch] = useState("");
  const [tradeSearch, setTradeSearch] = useState("");
  const [workOrderSpareId, setWorkOrderSpareId] = useState("");
  const [workOrderTradeId, setWorkOrderTradeId] = useState("");
  const [standardJobAction, setStandardJobAction] = useState<StandardJobActionDTO>({
    standardJobId: 0,
    assetId: undefined,
    scheduledDate: "",
    comments: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const filteredJobTypes = useMemo(() => {
    const needle = jobTypeSearch.trim().toLowerCase();
    if (!needle) return jobTypes;
    return jobTypes.filter((job) =>
      `${job.jobTypeName ?? ""} ${job.jobTypeDescription ?? ""}`.toLowerCase().includes(needle)
    );
  }, [jobTypes, jobTypeSearch]);

  const filteredSpares = useMemo(() => {
    const needle = spareSearch.trim().toLowerCase();
    if (!needle) return workOrderSpares;
    return workOrderSpares.filter((spare) =>
      `${spare.catalogueNumber ?? ""} ${spare.description ?? ""}`.toLowerCase().includes(needle)
    );
  }, [workOrderSpares, spareSearch]);

  const filteredTrades = useMemo(() => {
    const needle = tradeSearch.trim().toLowerCase();
    if (!needle) return workOrderTrades;
    return workOrderTrades.filter((trade) =>
      `${trade.tradeCodeName ?? ""}`.toLowerCase().includes(needle)
    );
  }, [workOrderTrades, tradeSearch]);

  useEffect(() => {
    if (!isReady || !services) return;
    setLoading(true);
    setError(null);

    const loadAll = async () => {
      const [jobTypeResult, sparesResult, tradesResult] = await Promise.all([
        services.jobTypes.getAll(),
        services.workOrderSpares.getAll(),
        services.workOrderTrades.getAll(),
      ]);

      if (jobTypeResult.ok) setJobTypes(jobTypeResult.value ?? []);
      if (sparesResult.ok) setWorkOrderSpares(sparesResult.value ?? []);
      if (tradesResult.ok) setWorkOrderTrades(tradesResult.value ?? []);

      if (!jobTypeResult.ok) setError(jobTypeResult.error.message);
      if (!sparesResult.ok) setError(sparesResult.error.message);
      if (!tradesResult.ok) setError(tradesResult.error.message);

      setLoading(false);
    };

    void loadAll();
  }, [isReady, services]);

  const handleStandardJob = async () => {
    if (!services) return;
    setError(null);
    setSuccess(null);

    if (!standardJobAction.standardJobId) {
      setError("Standard job ID is required.");
      return;
    }

    const result = await services.standardJobs.raiseWorkOrder({
      ...standardJobAction,
      standardJobId: Number(standardJobAction.standardJobId),
      assetId: standardJobAction.assetId ? Number(standardJobAction.assetId) : undefined,
    });

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setSuccess("Standard job raised successfully.");
    setStandardJobAction({
      standardJobId: 0,
      assetId: undefined,
      scheduledDate: "",
      comments: "",
    });
  };

  const handleFilterSpares = async () => {
    if (!services) return;
    if (!workOrderSpareId.trim()) {
      setError("Enter a work order ID to filter spares.");
      return;
    }
    setError(null);
    const result = await services.workOrderSpares.getByWorkOrderId(Number(workOrderSpareId));
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setWorkOrderSpares(result.value ?? []);
  };

  const handleFilterTrades = async () => {
    if (!services) return;
    if (!workOrderTradeId.trim()) {
      setError("Enter a work order ID to filter trades.");
      return;
    }
    setError(null);
    const result = await services.workOrderTrades.getByWorkOrderId(Number(workOrderTradeId));
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setWorkOrderTrades(result.value ?? []);
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
      {success && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-900/60 dark:bg-green-900/20 dark:text-green-200">
          {success}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">Work Orders</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Create and update work orders with employee actions.
          </p>
          <Link
            to="/admin/mex/work-orders"
            className="mt-4 inline-flex items-center justify-center rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-brand-300 hover:text-brand-600 dark:border-gray-700 dark:text-gray-200"
          >
            Manage work orders
          </Link>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">Standard Jobs</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Raise a new work order from a standard job template.
          </p>
          <div className="mt-4 grid gap-3">
            <div className="space-y-1">
              <Label htmlFor="mexStandardJobId">Standard job ID</Label>
              <Input
                id="mexStandardJobId"
                type="number"
                value={standardJobAction.standardJobId || ""}
                onChange={(e) =>
                  setStandardJobAction((prev) => ({
                    ...prev,
                    standardJobId: Number(e.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mexStandardJobAsset">Asset ID (optional)</Label>
              <Input
                id="mexStandardJobAsset"
                type="number"
                value={standardJobAction.assetId ?? ""}
                onChange={(e) =>
                  setStandardJobAction((prev) => ({
                    ...prev,
                    assetId: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mexStandardJobSchedule">Scheduled date</Label>
              <Input
                id="mexStandardJobSchedule"
                type="date"
                value={standardJobAction.scheduledDate ?? ""}
                onChange={(e) =>
                  setStandardJobAction((prev) => ({
                    ...prev,
                    scheduledDate: e.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mexStandardJobComments">Comments</Label>
              <Input
                id="mexStandardJobComments"
                type="text"
                value={standardJobAction.comments ?? ""}
                onChange={(e) =>
                  setStandardJobAction((prev) => ({
                    ...prev,
                    comments: e.target.value,
                  }))
                }
              />
            </div>
            <Button onClick={handleStandardJob} disabled={loading}>
              Raise work order
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">Job Types</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Search and inspect job type definitions.
          </p>
          <div className="mt-4 space-y-2">
            <Input
              id="mexJobTypeSearch"
              type="text"
              placeholder="Search job types"
              value={jobTypeSearch}
              onChange={(e) => setJobTypeSearch(e.target.value)}
            />
          </div>
          <div className="mt-4 max-h-60 overflow-y-auto">
            <Table className="text-sm">
              <TableBody>
                {filteredJobTypes.length === 0 ? (
                  <TableRow>
                    <td className="py-3 text-gray-500" colSpan={2}>
                      {loading ? "Loading job types…" : "No job types found."}
                    </td>
                  </TableRow>
                ) : (
                  filteredJobTypes.map((job) => (
                    <tr
                      key={job.jobTypeId ?? job.jobTypeName ?? Math.random()}
                      className="cursor-pointer border-b border-gray-100 hover:bg-gray-50"
                      onClick={() => setSelectedJobType(job)}
                    >
                      <TableCell className="py-2 font-medium">
                        {job.jobTypeName ?? "Unnamed"}
                      </TableCell>
                      <TableCell className="py-2 text-gray-500">
                        {job.jobTypeDescription ?? "No description"}
                      </TableCell>
                    </tr>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {selectedJobType && (
            <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-300">
              <div className="font-semibold text-gray-800 dark:text-white/90">
                {selectedJobType.jobTypeName}
              </div>
              <div className="mt-1">{selectedJobType.jobTypeDescription ?? "No description"}</div>
              <div className="mt-2">Active: {selectedJobType.isActive ? "Yes" : "No"}</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
                Work Order Spares
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Track spare parts per work order.
              </p>
            </div>
            <Button variant="outline" onClick={() => services?.workOrderSpares.getAll().then((res) => {
              if (res && res.ok) setWorkOrderSpares(res.value ?? []);
            })}>
              Refresh
            </Button>
          </div>

          <div className="mt-4 grid gap-2">
            <Input
              id="mexWorkOrderSpareSearch"
              type="text"
              placeholder="Search spares"
              value={spareSearch}
              onChange={(e) => setSpareSearch(e.target.value)}
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="mexWorkOrderSpareFilter"
                type="number"
                placeholder="Filter by work order ID"
                value={workOrderSpareId}
                onChange={(e) => setWorkOrderSpareId(e.target.value)}
              />
              <Button variant="outline" onClick={handleFilterSpares}>
                Filter
              </Button>
            </div>
          </div>

          <div className="mt-4 max-h-72 overflow-y-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-200 text-left text-xs uppercase text-gray-400">
                  <TableCell isHeader className="pb-2">
                    Catalogue #
                  </TableCell>
                  <TableCell isHeader className="pb-2">
                    Description
                  </TableCell>
                  <TableCell isHeader className="pb-2">
                    Qty
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSpares.length === 0 ? (
                  <TableRow>
                    <td className="py-3 text-gray-500" colSpan={3}>
                      {loading ? "Loading spares…" : "No spares found."}
                    </td>
                  </TableRow>
                ) : (
                  filteredSpares.map((spare) => (
                    <tr
                      key={spare.workOrderSpareId ?? spare.catalogueNumber ?? Math.random()}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedSpare(spare)}
                    >
                      <TableCell className="py-2 font-medium">
                        {spare.catalogueNumber ?? "—"}
                      </TableCell>
                      <TableCell className="py-2 text-gray-600">
                        {spare.description ?? "—"}
                      </TableCell>
                      <TableCell className="py-2 text-gray-600">
                        {spare.quantity ?? "—"}
                      </TableCell>
                    </tr>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {selectedSpare && (
            <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-300">
              <div className="font-semibold text-gray-800 dark:text-white/90">
                {selectedSpare.catalogueNumber ?? "Spare item"}
              </div>
              <div className="mt-1">Description: {selectedSpare.description ?? "—"}</div>
              <div className="mt-1">Unit cost: {selectedSpare.unitCost ?? "—"}</div>
              <div className="mt-1">Total cost: {selectedSpare.totalCost ?? "—"}</div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
                Work Order Trades
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Review trade entries logged against work orders.
              </p>
            </div>
            <Button variant="outline" onClick={() => services?.workOrderTrades.getAll().then((res) => {
              if (res && res.ok) setWorkOrderTrades(res.value ?? []);
            })}>
              Refresh
            </Button>
          </div>

          <div className="mt-4 grid gap-2">
            <Input
              id="mexWorkOrderTradeSearch"
              type="text"
              placeholder="Search trades"
              value={tradeSearch}
              onChange={(e) => setTradeSearch(e.target.value)}
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="mexWorkOrderTradeFilter"
                type="number"
                placeholder="Filter by work order ID"
                value={workOrderTradeId}
                onChange={(e) => setWorkOrderTradeId(e.target.value)}
              />
              <Button variant="outline" onClick={handleFilterTrades}>
                Filter
              </Button>
            </div>
          </div>

          <div className="mt-4 max-h-72 overflow-y-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow className="border-b border-gray-200 text-left text-xs uppercase text-gray-400">
                  <TableCell isHeader className="pb-2">
                    Trade
                  </TableCell>
                  <TableCell isHeader className="pb-2">
                    Hours
                  </TableCell>
                  <TableCell isHeader className="pb-2">
                    Cost
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTrades.length === 0 ? (
                  <TableRow>
                    <td className="py-3 text-gray-500" colSpan={3}>
                      {loading ? "Loading trades…" : "No trades found."}
                    </td>
                  </TableRow>
                ) : (
                  filteredTrades.map((trade) => (
                    <tr
                      key={trade.workOrderTradeId ?? trade.tradeCodeName ?? Math.random()}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedTrade(trade)}
                    >
                      <TableCell className="py-2 font-medium">
                        {trade.tradeCodeName ?? "—"}
                      </TableCell>
                      <TableCell className="py-2 text-gray-600">
                        {trade.hoursWorked ?? "—"}
                      </TableCell>
                      <TableCell className="py-2 text-gray-600">
                        {trade.totalCost ?? "—"}
                      </TableCell>
                    </tr>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {selectedTrade && (
            <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-300">
              <div className="font-semibold text-gray-800 dark:text-white/90">
                {selectedTrade.tradeCodeName ?? "Trade entry"}
              </div>
              <div className="mt-1">Hours: {selectedTrade.hoursWorked ?? "—"}</div>
              <div className="mt-1">Hourly rate: {selectedTrade.hourlyRate ?? "—"}</div>
              <div className="mt-1">Work date: {selectedTrade.workDate ?? "—"}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
