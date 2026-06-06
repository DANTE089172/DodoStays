using System.Text.Json;
using Microsoft.Extensions.Options;

namespace Dodostays.Api.Modules.Payments.Email;

public sealed class LogEmailSender : IEmailSender
{
    private readonly IWebHostEnvironment _env;
    private readonly EmailOptions _options;
    private readonly ILogger<LogEmailSender> _logger;

    public LogEmailSender(IWebHostEnvironment env, IOptions<EmailOptions> options, ILogger<LogEmailSender> logger)
    {
        _env = env;
        _options = options.Value;
        _logger = logger;
    }

    public string ProviderId => "Log";

    public async Task<string> SendAsync(EmailMessage message, CancellationToken ct)
    {
        var messageId = Guid.NewGuid().ToString("N");

        // OutputDir is "wwwroot/emails" by default; we trim the wwwroot/ prefix because env.WebRootPath already points at it.
        var rel = _options.OutputDir.StartsWith("wwwroot/") ? _options.OutputDir["wwwroot/".Length..] : _options.OutputDir;
        var dateDir = DateTimeOffset.UtcNow.ToString("yyyy-MM-dd");
        var dir = Path.Combine(_env.WebRootPath, rel, dateDir);
        Directory.CreateDirectory(dir);

        var envelope = new
        {
            MessageId = messageId,
            SentAt = DateTimeOffset.UtcNow,
            To = message.To,
            From = _options.FromAddress,
            Subject = message.Subject,
            IsHtml = message.IsHtml,
            Body = message.Body,
            ReplyTo = message.ReplyTo,
            Attachments = message.Attachments?.Select(a => new { a.FileName, a.ContentType, ContentLength = a.Content.Length }).ToArray() ?? Array.Empty<object>()
        };

        var json = JsonSerializer.Serialize(envelope, new JsonSerializerOptions { WriteIndented = true });
        var path = Path.Combine(dir, $"{messageId}.eml.json");
        await File.WriteAllTextAsync(path, json, ct);

        if (message.Attachments != null)
        {
            foreach (var attachment in message.Attachments)
            {
                var attachmentPath = Path.Combine(dir, $"{messageId}-{attachment.FileName}");
                await File.WriteAllBytesAsync(attachmentPath, attachment.Content, ct);
            }
        }

        _logger.LogInformation("Email queued (Log): To={To} Subject={Subject} MessageId={Id}", message.To, message.Subject, messageId);

        return messageId;
    }
}
