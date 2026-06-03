namespace HPA.SurveyFlow.Domain.Sms;

public interface ISmsSender
{
    Task<SmsSendResult> SendAsync(SmsMessage message, CancellationToken ct = default);
}
