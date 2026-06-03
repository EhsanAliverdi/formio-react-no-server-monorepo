using System.Net.Http.Headers;
using System.Net.Http.Json;
using HPA.SurveyFlow.Domain.Sms;
using Microsoft.Extensions.Logging;

namespace HPA.SurveyFlow.Infrastructure.Sms;

public sealed class MessageMediaSmsSender(
    string apiKey,
    string apiSecret,
    string? sourceNumber,
    string? sourceNumberType,
    string? callbackUrl,
    bool deliveryReport,
    ILogger logger) : ISmsSender
{
    private const string ApiUrl = "https://api.messagemedia.com/v1/messages";

    public async Task<SmsSendResult> SendAsync(SmsMessage message, CancellationToken ct = default)
    {
        var messages = message.To
            .Where(n => !string.IsNullOrWhiteSpace(n))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Select(number => new Dictionary<string, object?>
            {
                ["content"] = message.Body,
                ["destination_number"] = number,
                ["format"] = "SMS",
                ["source_number"] = string.IsNullOrWhiteSpace(sourceNumber) ? null : sourceNumber,
                ["source_number_type"] = string.IsNullOrWhiteSpace(sourceNumberType) ? null : sourceNumberType,
                ["callback_url"] = string.IsNullOrWhiteSpace(callbackUrl) ? null : callbackUrl,
                ["delivery_report"] = deliveryReport ? true : null,
            }.Where(kv => kv.Value != null).ToDictionary(kv => kv.Key, kv => kv.Value))
            .ToArray();

        var credentials = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes($"{apiKey}:{apiSecret}"));
        using var http = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
        http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Basic", credentials);
        http.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        logger.LogDebug("MessageMedia sending SMS to {Count} recipient(s)", messages.Length);
        var response = await http.PostAsJsonAsync(ApiUrl, new { messages }, ct);
        var responseBody = await response.Content.ReadAsStringAsync(ct);
        response.EnsureSuccessStatusCode();

        return new SmsSendResult
        {
            StatusCode = (int)response.StatusCode,
            ResponseBody = responseBody,
        };
    }
}
