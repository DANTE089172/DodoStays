namespace Dodostays.Api.Modules.Bookings.Domain;

public class ExternalCalendarBlock
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ListingId { get; set; }
    public Guid FeedId { get; set; }
    public string ExternalUid { get; set; } = string.Empty;
    public DateOnly CheckIn { get; set; }
    public DateOnly CheckOut { get; set; }
    public string? Summary { get; set; }
    public DateTimeOffset SyncedAt { get; set; } = DateTimeOffset.UtcNow;
}
