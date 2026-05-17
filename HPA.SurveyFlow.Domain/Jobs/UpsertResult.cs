namespace HPA.SurveyFlow.Domain.Jobs;

/// <summary>
/// Counts returned by a job's UpsertAsync implementation.
/// The framework aggregates these across all windows and includes them in the result summary.
/// </summary>
public record UpsertResult(
    int Inserted,
    int Updated,
    int Skipped,
    int Unchanged
)
{
    public static UpsertResult Empty => new(0, 0, 0, 0);

    public static UpsertResult operator +(UpsertResult a, UpsertResult b) =>
        new(a.Inserted + b.Inserted, a.Updated + b.Updated,
            a.Skipped  + b.Skipped,  a.Unchanged + b.Unchanged);
}
