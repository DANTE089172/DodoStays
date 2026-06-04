namespace Dodostays.Api.Modules.Identity.Kyc;

public sealed class KycOptions
{
    public string Provider { get; set; } = "InMemory";
    public string? OnfidoApiKey { get; set; }
    public string? OnfidoBaseUrl { get; set; }
    public string? OnfidoWebhookSecret { get; set; }
}
