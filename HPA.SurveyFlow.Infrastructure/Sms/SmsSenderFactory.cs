using HPA.SurveyFlow.Domain.Sms;
using Microsoft.Extensions.Logging;

namespace HPA.SurveyFlow.Infrastructure.Sms;

public static class SmsSenderFactory
{
    public static ISmsSender? Create(IReadOnlyDictionary<string, string?> settings, ILogger logger)
    {
        if (settings.GetValueOrDefault("integration.sms.enabled") != "true")
            return null;

        var provider = settings.GetValueOrDefault("integration.sms.provider") ?? "messagemedia";
        if (!provider.Equals("messagemedia", StringComparison.OrdinalIgnoreCase))
        {
            logger.LogWarning("SMS provider '{Provider}' is not supported.", provider);
            return null;
        }

        var apiKey = settings.GetValueOrDefault("integration.sms.messageMediaApiKey");
        var apiSecret = settings.GetValueOrDefault("integration.sms.messageMediaApiSecret");
        if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(apiSecret))
        {
            logger.LogWarning("MessageMedia SMS provider selected but API key/secret are not configured.");
            return null;
        }

        return new MessageMediaSmsSender(
            apiKey,
            apiSecret,
            settings.GetValueOrDefault("integration.sms.sourceNumber"),
            settings.GetValueOrDefault("integration.sms.sourceNumberType"),
            settings.GetValueOrDefault("integration.sms.callbackUrl"),
            settings.GetValueOrDefault("integration.sms.deliveryReport") == "true",
            logger);
    }
}
