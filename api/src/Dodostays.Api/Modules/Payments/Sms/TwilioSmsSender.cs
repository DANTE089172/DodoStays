using Microsoft.Extensions.Options;

namespace Dodostays.Api.Modules.Payments.Sms;

public sealed class TwilioSmsSender : ISmsSender
{
    private readonly SmsOptions _options;
    private readonly ILogger<TwilioSmsSender> _logger;

    public TwilioSmsSender(IOptions<SmsOptions> options, ILogger<TwilioSmsSender> logger)
    {
        _options = options.Value;
        _logger = logger;

        if (string.IsNullOrWhiteSpace(_options.TwilioAccountSid))
            throw new InvalidOperationException("Sms:TwilioAccountSid is required when provider is Twilio.");
        if (string.IsNullOrWhiteSpace(_options.TwilioAuthToken))
            throw new InvalidOperationException("Sms:TwilioAuthToken is required when provider is Twilio.");
        if (string.IsNullOrWhiteSpace(_options.TwilioFromNumber))
            throw new InvalidOperationException("Sms:TwilioFromNumber is required when provider is Twilio.");
    }

    public string ProviderId => "Twilio";

    public Task<string> SendAsync(SmsMessage message, CancellationToken ct)
    {
        // Real Twilio integration is deferred to Plan 09.
        // For now, calling this throws — production config must use Log until then.
        throw new NotImplementedException("Twilio integration not yet wired — Plan 09 deferred");
    }
}
