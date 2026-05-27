namespace HPA.SurveyFlow.Domain.Email;

public sealed class EmailMessage
{
    public required IReadOnlyList<string> To { get; init; }
    public required string Subject { get; init; }
    public required string BodyHtml { get; init; }
    public string? FromEmail { get; init; }
    public string? FromName { get; init; }
    public EmailAttachment? Attachment { get; init; }
}

public sealed class EmailAttachment
{
    public required byte[] Bytes { get; init; }
    public required string FileName { get; init; }
    public string ContentType { get; init; } = "application/pdf";
}
