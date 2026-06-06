namespace Dodostays.Api.Modules.Payments.Email;

public interface IEmailSender
{
    string ProviderId { get; } // "Log" | "Resend"

    /// <summary>
    /// Sends an email. Body may be plain text or HTML — caller provides via `isHtml` flag.
    /// Optional attachments — typically a single PDF (e.g. invoice).
    /// Returns a provider-specific message id; LogEmailSender returns a synthetic guid.
    /// </summary>
    Task<string> SendAsync(EmailMessage message, CancellationToken ct);
}

public sealed record EmailMessage(
    string To,
    string Subject,
    string Body,
    bool IsHtml = true,
    IReadOnlyList<EmailAttachment>? Attachments = null,
    string? ReplyTo = null);

public sealed record EmailAttachment(
    string FileName,
    string ContentType, // "application/pdf"
    byte[] Content);
