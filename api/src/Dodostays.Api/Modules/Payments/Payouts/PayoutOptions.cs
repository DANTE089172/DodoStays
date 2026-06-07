namespace Dodostays.Api.Modules.Payments.Payouts;

public class PayoutOptions
{
    public const string SectionName = "Payouts";
    public string Provider { get; set; } = "InMemory"; // "InMemory" | "Wise"
    public string WiseApiKey { get; set; } = "";
    public string WiseProfileId { get; set; } = "";
    public decimal CommissionPercent { get; set; } = 5m; // 5% host commission
    public bool BiweeklyEvenWeeks { get; set; } = true; // run on even week-of-year
}
