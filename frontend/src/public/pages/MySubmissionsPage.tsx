import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../template/tailAdmin/components/ui/button/Button";
import { Modal } from "../../template/tailAdmin/components/ui/modal";
import FormSubmissionViewer from "../../shared/components/formio/FormSubmissionViewer";
import { buildSubmissionPdfBodyFromDetail, createHtmlDocument } from "../../shared/components/formio/FormioPdfExport";
import {
  exportMySubmissionPdf,
  getMySubmissionById,
  getMySubmissions,
  type MySubmissionDetail,
  type MySubmissionListItem,
} from "../../shared/services/submissionService";

function formatWhen(value: string): string {
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return value;
  return new Date(t).toLocaleString();
}

export default function MySubmissionsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<MySubmissionListItem[]>([]);

  const [viewId, setViewId] = useState<number | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detail, setDetail] = useState<MySubmissionDetail | null>(null);

  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getMySubmissions();
        setItems(Array.isArray(data.items) ? data.items : []);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // If not logged in, redirect to public login.
        if (/401|unauthorized/i.test(msg)) {
          navigate("/login", { replace: true });
          return;
        }
        setError(msg || "Failed to load submissions.");
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  useEffect(() => {
    if (viewId == null) return;
    (async () => {
      setDetailLoading(true);
      setDetailError(null);
      setDetail(null);
      try {
        const d = await getMySubmissionById(viewId);
        setDetail(d);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/401|unauthorized/i.test(msg)) {
          navigate("/login", { replace: true });
          return;
        }
        setDetailError(msg || "Failed to load submission.");
      } finally {
        setDetailLoading(false);
      }
    })();
  }, [navigate, viewId]);

  const rows = useMemo(() => {
    return items.map((s) => ({
      ...s,
      submitted_at_fmt: s.submitted_at ? formatWhen(s.submitted_at) : "—",
    }));
  }, [items]);

  const startExport = async () => {
    if (!detail) return;
    if (!detail.can_export_pdf) return;

    setExporting(true);
    try {
      const htmlBody = buildSubmissionPdfBodyFromDetail({
        id: detail.id,
        form_id: detail.form_id,
        form_name: detail.form_name,
        submitted_at: detail.submitted_at,
        user_email: detail.user_email,
        updated_at: detail.updated_at,
        updated_by_email: "—",
        edit_history: [],
        abnormalities: [],
        form: detail.form,
        data: detail.data,
      });
      const html = createHtmlDocument(htmlBody);

      const blob = await exportMySubmissionPdf(detail.id, {
        html,
        fileName: `submission-${detail.id}-${detail.form_name}`,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `submission-${detail.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">My submissions</h2>
      </div>

      {error ? (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <div className="text-gray-600">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-gray-500">No submissions yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Submission</th>
                <th className="px-4 py-3 text-left font-semibold">Form</th>
                <th className="px-4 py-3 text-left font-semibold">Submitted</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">#{r.id}</td>
                  <td className="px-4 py-3">{r.form_name}</td>
                  <td className="px-4 py-3">{r.submitted_at_fmt}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => setViewId(r.id)}>
                        View
                      </Button>
                      {r.can_export_pdf ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setViewId(r.id);
                          }}
                        >
                          Export PDF
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        isOpen={viewId != null}
        onClose={() => {
          setViewId(null);
          setDetail(null);
          setDetailError(null);
        }}
        className="w-[80vw] h-[80vh] max-w-6xl overflow-y-auto p-6"
      >
        <div className="text-xl font-bold mb-2">Submission</div>

        {detailLoading ? <div>Loading…</div> : null}
        {detailError ? (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-700">{detailError}</div>
        ) : null}

        {detail && (
          <>
            <div className="mb-4 text-sm text-gray-700">
              <div>
                <span className="font-semibold">Form:</span> {detail.form_name}
              </div>
              <div>
                <span className="font-semibold">Submitted:</span> {detail.submitted_at ? formatWhen(detail.submitted_at) : "—"}
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              {detail.form != null ? (
                <FormSubmissionViewer form={detail.form} data={detail.data} />
              ) : (
                <div className="rounded border border-yellow-200 bg-yellow-50 p-3 text-yellow-800">
                  Submission loaded but the form schema could not be parsed.
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setViewId(null)}>
                Close
              </Button>
              {detail.can_export_pdf ? (
                <Button variant="outline" size="sm" disabled={exporting} onClick={() => void startExport()}>
                  {exporting ? "Exporting…" : "Export PDF"}
                </Button>
              ) : null}
            </div>

            {!detail.can_export_pdf ? (
              <div className="mt-3 text-xs text-gray-500">
                PDF export is disabled for this form.
              </div>
            ) : null}
          </>
        )}
      </Modal>
    </div>
  );
}
