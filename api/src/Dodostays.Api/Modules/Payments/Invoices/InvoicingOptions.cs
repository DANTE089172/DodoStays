namespace Dodostays.Api.Modules.Payments.Invoices;

public class InvoicingOptions
{
    public const string SectionName = "Invoicing";
    public string GuestSequencePrefix { get; set; } = "DS";
    public string CommissionSequencePrefix { get; set; } = "DS-COM";
    public string CreditNoteSequencePrefix { get; set; } = "DS-CN";

    /// <summary>Where invoice PDFs are stored: "Local" (Fly volume, ephemeral) or "R2" (Cloudflare R2, durable).</summary>
    public string StorageProvider { get; set; } = "Local";

    // --- Cloudflare R2 settings (used when StorageProvider == "R2") ---
    public string? R2AccountId { get; set; }

    /// <summary>Optional explicit S3-compatible host:port. When empty, derived from <see cref="R2AccountId"/>. Tests point this at a MinIO container.</summary>
    public string? R2Endpoint { get; set; }

    public bool R2UseSsl { get; set; } = true;
    public string? R2AccessKeyId { get; set; }
    public string? R2SecretAccessKey { get; set; }
    public string? R2Bucket { get; set; }
}
