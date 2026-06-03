namespace HPA.SurveyFlow.Domain.Sms;

public sealed class SmsMessage
{
    public required IReadOnlyList<string> To { get; init; }
    public required string Body { get; init; }
}

public sealed class SmsSendResult
{
    public required int StatusCode { get; init; }
    public required string ResponseBody { get; init; }
}
