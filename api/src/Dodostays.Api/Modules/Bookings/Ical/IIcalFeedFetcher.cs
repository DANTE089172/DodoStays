namespace Dodostays.Api.Modules.Bookings.Ical;

public interface IIcalFeedFetcher
{
    Task<string> FetchAsync(string url, CancellationToken ct);
}
