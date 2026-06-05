namespace Dodostays.Api.Modules.Bookings.Domain;

public class ExternalCalendarFeed
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ListingId { get; set; }
    public string Source { get; set; } = "Airbnb";
    public string Url { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? LastSyncedAt { get; set; }
    public string? LastError { get; set; }
}
