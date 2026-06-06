namespace Dodostays.Api.Modules.Payments.Processing;

public sealed class PaymentOptions
{
    public const string SectionName = "Payments";
    public string Provider { get; set; } = "InMemory";
    public string MipsApiKey { get; set; } = "";
    public string MipsBaseUrl { get; set; } = "";
    public string MipsMerchantId { get; set; } = "";
    public string MerchantOfRecord { get; set; } = "DodoStays Ltd";
    public string MerchantVatNumber { get; set; } = "";
    public string MerchantAddress { get; set; } = "";
}
