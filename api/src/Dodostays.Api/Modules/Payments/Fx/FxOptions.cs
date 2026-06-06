namespace Dodostays.Api.Modules.Payments.Fx;

public class FxOptions
{
    public const string SectionName = "Fx";
    public string Provider { get; set; } = "Fixed"; // "Fixed" | future "OpenExchangeRates"
}
