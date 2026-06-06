using Microsoft.Extensions.Options;

namespace Dodostays.Api.Modules.Payments.Email;

public sealed class ResendEmailSender : IEmailSender
{
    private readonly EmailOptions _options;
    private readonly ILogger<ResendEmailSender> _logger;

    public ResendEmailSender(IOptions<EmailOptions> options, ILogger<ResendEmailSender> logger)
    {
        _options = options.Value;
        _logger = logger;

        if (string.IsNullOrWhiteSpace(_options.ResendApiKey))
            throw new InvalidOperationException("Email:ResendApiKey is required when provider is Resend.");
    }

    public string ProviderId => "Resend";

    public Task<string> SendAsync(EmailMessage message, CancellationToken ct)
    {
        // Real Resend integration is deferred to Plan 09.
        // For now, calling this throws — production config must use Log until then.
        throw new NotImplementedException("Resend integration not yet wired — Plan 09 deferred");
    }
}
