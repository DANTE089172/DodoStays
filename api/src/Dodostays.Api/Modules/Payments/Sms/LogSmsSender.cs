using System.Text.Json;
using Microsoft.Extensions.Options;

namespace Dodostays.Api.Modules.Payments.Sms;

public sealed class LogSmsSender : ISmsSender
{
    private readonly IWebHostEnvironment _env;
    private readonly SmsOptions _options;
    private readonly ILogger<LogSmsSender> _logger;

    public LogSmsSender(IWebHostEnvironment env, IOptions<SmsOptions> options, ILogger<LogSmsSender> logger)
    {
        _env = env;
        _options = options.Value;
        _logger = logger;
    }

    public string ProviderId => "Log";

    public async Task<string> SendAsync(SmsMessage message, CancellationToken ct)
    {
        var messageId = Guid.NewGuid().ToString("N");

        // OutputDir is "wwwroot/sms" by default; we trim the wwwroot/ prefix because env.WebRootPath already points at it.
        var rel = _options.OutputDir.StartsWith("wwwroot/") ? _options.OutputDir["wwwroot/".Length..] : _options.OutputDir;
        var dateDir = DateTimeOffset.UtcNow.ToString("yyyy-MM-dd");
        var dir = Path.Combine(_env.WebRootPath, rel, dateDir);
        Directory.CreateDirectory(dir);

        var envelope = new
        {
            MessageId = messageId,
            SentAt = DateTimeOffset.UtcNow,
            To = message.ToPhoneE164,
            From = "+230-DODO-DEV",
            Body = message.Body
        };

        var json = JsonSerializer.Serialize(envelope, new JsonSerializerOptions { WriteIndented = true });
        var path = Path.Combine(dir, $"{messageId}.sms.json");
        await File.WriteAllTextAsync(path, json, ct);

        _logger.LogInformation("SMS queued (Log): To={To} Body={Body} MessageId={Id}", message.ToPhoneE164, message.Body, messageId);

        return messageId;
    }
}
