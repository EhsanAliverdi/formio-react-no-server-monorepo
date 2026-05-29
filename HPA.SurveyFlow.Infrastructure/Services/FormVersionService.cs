using HPA.SurveyFlow.Domain.Entities;
using HPA.SurveyFlow.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace HPA.SurveyFlow.Infrastructure.Services;

public class FormVersionService(AppDbContext db)
{
    /// <summary>
    /// Saves a snapshot of the form's current JSON before the caller applies edits.
    /// Version numbers are per-form, auto-incremented.
    /// </summary>
    public async Task<FormVersion> SnapshotAsync(int formId, string json, int createdBy, string? changeSummary = null)
    {
        var nextVersion = await db.FormVersions
            .Where(v => v.FormId == formId)
            .MaxAsync(v => (int?)v.VersionNumber) ?? 0;
        nextVersion++;

        var version = new FormVersion
        {
            FormId        = formId,
            VersionNumber = nextVersion,
            JsonSnapshot  = json,
            ChangeSummary = changeSummary,
            CreatedBy     = createdBy,
            CreatedAt     = DateTime.UtcNow,
        };

        db.FormVersions.Add(version);
        await db.SaveChangesAsync();
        return version;
    }

    /// <summary>
    /// Restores a previous version's JSON back to the form and creates a new snapshot recording the restore.
    /// </summary>
    public async Task<Form?> RestoreAsync(int formId, int versionNumber, int restoredBy)
    {
        var form = await db.Forms.FindAsync(formId);
        if (form == null) return null;

        var version = await db.FormVersions.FirstOrDefaultAsync(v => v.FormId == formId && v.VersionNumber == versionNumber);
        if (version == null) return null;

        // Snapshot current state before overwriting
        await SnapshotAsync(formId, form.Json, restoredBy, $"Auto-snapshot before restoring to v{versionNumber}");

        form.Json = version.JsonSnapshot;
        await db.SaveChangesAsync();
        return form;
    }
}
