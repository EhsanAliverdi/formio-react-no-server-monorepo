using ClosedXML.Excel;
using HPA.SurveyFlow.Domain.DTOs.Requests;
using HPA.SurveyFlow.Domain.DTOs.Responses;
using HPA.SurveyFlow.Domain.Entities;

namespace HPA.SurveyFlow.Infrastructure.Services;

/// <summary>
/// Generates a styled .xlsx workbook from a report execution result.
/// </summary>
public class ExcelExportService
{
    public byte[] GenerateWorkbook(
        ReportTemplate template,
        List<ReportColumnDefinitionDto> columns,
        List<Dictionary<string, object?>> rows)
    {
        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add(Sanitise(template.Name));

        // Header row
        for (var c = 0; c < columns.Count; c++)
        {
            var cell = sheet.Cell(1, c + 1);
            cell.Value = columns[c].Label ?? columns[c].FieldKey;
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#2563EB"); // brand-600
            cell.Style.Font.FontColor = XLColor.White;
            cell.Style.Alignment.Horizontal = XLAlignmentHorizontalValues.Left;
        }

        // Add _submitted_at as a final column if present in rows
        var hasSubmittedAt = rows.Any(r => r.ContainsKey("_submitted_at"));
        if (hasSubmittedAt)
        {
            var lastCol = columns.Count + 1;
            var cell = sheet.Cell(1, lastCol);
            cell.Value = "Submitted At";
            cell.Style.Font.Bold = true;
            cell.Style.Fill.BackgroundColor = XLColor.FromHtml("#2563EB");
            cell.Style.Font.FontColor = XLColor.White;
        }

        // Data rows
        for (var r = 0; r < rows.Count; r++)
        {
            var row = rows[r];
            for (var c = 0; c < columns.Count; c++)
            {
                var val = row.TryGetValue(columns[c].FieldKey, out var v) ? v?.ToString() ?? "" : "";
                sheet.Cell(r + 2, c + 1).Value = val;
            }
            if (hasSubmittedAt)
            {
                var submittedAt = row.TryGetValue("_submitted_at", out var sa) ? sa?.ToString() ?? "" : "";
                sheet.Cell(r + 2, columns.Count + 1).Value = submittedAt;
            }

            // Zebra striping
            if (r % 2 == 1)
            {
                var rowRange = sheet.Row(r + 2);
                rowRange.Style.Fill.BackgroundColor = XLColor.FromHtml("#F9FAFB");
            }
        }

        // Auto-fit columns
        sheet.Columns().AdjustToContents(minWidth: 10, maxWidth: 50);

        // Freeze header row
        sheet.SheetView.FreezeRows(1);

        // Table border
        if (rows.Count > 0)
        {
            var tableRange = sheet.Range(1, 1, rows.Count + 1, columns.Count + (hasSubmittedAt ? 1 : 0));
            tableRange.Style.Border.OutsideBorder = XLBorderStyleValues.Thin;
            tableRange.Style.Border.OutsideBorderColor = XLColor.FromHtml("#E5E7EB");
            tableRange.Style.Border.InsideBorder = XLBorderStyleValues.Hair;
            tableRange.Style.Border.InsideBorderColor = XLColor.FromHtml("#E5E7EB");
        }

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return ms.ToArray();
    }

    private static string Sanitise(string name)
    {
        // Excel sheet names: max 31 chars, no invalid characters
        var invalid = new[] { ':', '\\', '/', '?', '*', '[', ']' };
        var safe = new string(name.Where(c => !invalid.Contains(c)).ToArray());
        return safe.Length > 31 ? safe[..31] : (safe.Length == 0 ? "Report" : safe);
    }
}
