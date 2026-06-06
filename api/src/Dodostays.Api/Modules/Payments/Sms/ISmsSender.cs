namespace Dodostays.Api.Modules.Payments.Sms;

public interface ISmsSender
{
    string ProviderId { get; }
    Task<string> SendAsync(SmsMessage message, CancellationToken ct);
}

public sealed record SmsMessage(string ToPhoneE164, string Body);
