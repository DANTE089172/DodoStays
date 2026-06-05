namespace Dodostays.Api.Modules.Bookings.Ical;

public sealed class IcalOptions
{
    public string SigningKey { get; set; } = string.Empty;
    public string FeedBaseUrl { get; set; } = string.Empty;
    public TimeSpan FetchTimeout { get; set; } = TimeSpan.FromSeconds(15);
}
