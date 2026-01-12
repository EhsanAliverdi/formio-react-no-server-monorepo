import { useMemo } from "react";
import { jsPDF } from "jspdf";
import Button from "../../../template/tailAdmin/components/ui/button/Button";

export type PreviewItem = {
  label: string;
  value: string;
};

type Props = {
  title?: string;
  items: PreviewItem[];
  allowPdfDownload: boolean;
  onBack: () => void;
  onConfirmSubmit: () => void;
};

function downloadItemsAsPdf(title: string, items: PreviewItem[]) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let y = 50;

  doc.setFontSize(16);
  doc.text(title || "Form draft", marginX, y);
  y += 24;

  doc.setFontSize(11);

  const maxWidth = pageWidth - marginX * 2;

  for (const item of items) {
    const label = item.label || "(unnamed)";
    const value = item.value || "";

    const labelLines = doc.splitTextToSize(`${label}:`, maxWidth);
    const valueLines = doc.splitTextToSize(value, maxWidth);

    const blockHeight = (labelLines.length + valueLines.length) * 14 + 10;
    if (y + blockHeight > pageHeight - 40) {
      doc.addPage();
      y = 50;
    }

    doc.setFont("helvetica", "bold");
    doc.text(labelLines, marginX, y);
    y += labelLines.length * 14;

    doc.setFont("helvetica", "normal");
    doc.text(valueLines.length ? valueLines : [""], marginX, y);
    y += valueLines.length * 14 + 10;
  }

  const safeTitle = String(title || "form-draft")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  doc.save(`${safeTitle || "form-draft"}.pdf`);
}

export default function SubmissionPreview({
  title = "Review before submission",
  items,
  allowPdfDownload,
  onBack,
  onConfirmSubmit,
}: Props) {
  const hasItems = items.length > 0;

  const nonEmptyItems = useMemo(() => {
    return items.filter((i) => (i.label || "").trim().length > 0 || (i.value || "").trim().length > 0);
  }, [items]);

  return (
    <div className="w-full">
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-4">
          <div className="text-lg font-semibold text-gray-900">{title}</div>
          <div className="text-sm text-gray-600">Confirm your answers before submitting.</div>
        </div>

        {!hasItems ? (
          <div className="rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            No answers to preview.
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-auto rounded border border-gray-200">
            <table className="w-full border-collapse text-sm">
              <tbody>
                {nonEmptyItems.map((item, idx) => (
                  <tr key={`${item.label}-${idx}`} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="w-1/3 align-top border-b border-gray-200 p-3 font-medium text-gray-900">
                      {item.label}
                    </td>
                    <td className="align-top border-b border-gray-200 p-3 text-gray-700 whitespace-pre-wrap">
                      {item.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          {allowPdfDownload && hasItems && (
            <Button variant="outline" size="sm" onClick={() => downloadItemsAsPdf(title, nonEmptyItems)}>
              Download PDF
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={onBack}>
            Back
          </Button>

          <Button size="sm" onClick={onConfirmSubmit}>
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
}
