import { useState } from "react";
import Button from "../../../../template/tailAdmin/components/ui/button/Button";
import Input from "../../../../template/tailAdmin/components/form/input/InputField";
import Label from "../../../../template/tailAdmin/components/form/Label";
import MexMaintenanceDrawer from "./MexMaintenanceDrawer";
import { useMexMaintenanceServices } from "./mexMaintenanceServices";

type StandardJobSubmission = {
  id: number;
  standardJobId: number;
  assetId?: number;
  scheduledDate?: string;
  createdAt: string;
};

export default function MexMaintenanceStandardJobs() {
  const { isReady, config, services } = useMexMaintenanceServices();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [standardJobId, setStandardJobId] = useState("");
  const [assetId, setAssetId] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [comments, setComments] = useState("");
  const [submissions, setSubmissions] = useState<StandardJobSubmission[]>([]);

  const handleRaise = async () => {
    if (!services) return;
    if (!standardJobId.trim()) {
      setError("Standard job ID is required.");
      return;
    }
    const parsedStandardJobId = Number(standardJobId);
    if (!Number.isFinite(parsedStandardJobId)) {
      setError("Standard job ID must be numeric.");
      return;
    }

    setError(null);

    const payload = {
      standardJobId: parsedStandardJobId,
      assetId: assetId ? Number(assetId) : undefined,
      scheduledDate: scheduledDate || undefined,
      comments: comments || undefined,
    };

    const result = await services.standardJobs.raiseWorkOrder(payload);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setSubmissions((prev) => [
      {
        id: Date.now(),
        standardJobId: payload.standardJobId,
        assetId: payload.assetId,
        scheduledDate: payload.scheduledDate,
        createdAt: new Date().toLocaleString(),
      },
      ...prev,
    ]);
    setDrawerOpen(false);
    setStandardJobId("");
    setAssetId("");
    setScheduledDate("");
    setComments("");
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Standard jobs
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Raise work orders from standard job templates by ID.
          </p>
        </div>
        <Button size="sm" onClick={() => setDrawerOpen(true)}>
          Raise Work Order
        </Button>
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
              <th className="px-4 py-3 text-left">Job Name</th>
              <th className="px-4 py-3 text-left">Asset</th>
              <th className="px-4 py-3 text-left">Frequency</th>
              <th className="px-4 py-3 text-left">Last Raised</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {submissions.map((submission) => (
              <tr key={submission.id} className="text-gray-700 dark:text-gray-200">
                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white/90">
                  Standard Job #{submission.standardJobId}
                </td>
                <td className="px-4 py-3">
                  {submission.assetId ? `Asset #${submission.assetId}` : "—"}
                </td>
                <td className="px-4 py-3">On demand</td>
                <td className="px-4 py-3">{submission.createdAt}</td>
              </tr>
            ))}
            {submissions.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={4}>
                  No standard jobs have been raised in this session.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <MexMaintenanceDrawer
        isOpen={drawerOpen}
        title="Raise work order"
        onClose={() => setDrawerOpen(false)}
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" size="sm" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleRaise}>
              Submit
            </Button>
          </div>
        }
      >
        <div className="grid gap-4">
          <div>
            <Label>Standard Job ID</Label>
            <Input value={standardJobId} onChange={(event) => setStandardJobId(event.target.value)} />
          </div>
          <div>
            <Label>Asset ID (optional)</Label>
            <Input value={assetId} onChange={(event) => setAssetId(event.target.value)} />
          </div>
          <div>
            <Label>Scheduled Date (optional)</Label>
            <Input
              value={scheduledDate}
              onChange={(event) => setScheduledDate(event.target.value)}
              placeholder="YYYY-MM-DD"
            />
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
