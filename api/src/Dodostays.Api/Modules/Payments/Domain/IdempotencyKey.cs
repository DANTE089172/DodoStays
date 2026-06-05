namespace Dodostays.Api.Modules.Payments.Domain;

public class IdempotencyKey
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// SHA-256 hash of "scope:headerKey".
    /// </summary>
    public string KeyHash { get; set; } = string.Empty;

    /// <summary>
    /// Scope discriminator (e.g. "confirm-booking", "payout") so the same header value cannot
    /// collide across distinct operations.
    /// </summary>
    public string Scope { get; set; } = string.Empty;

    /// <summary>
    /// Optional booking association (for payment-confirm scope).
    /// </summary>
    public Guid? BookingId { get; set; }

    /// <summary>
    /// Cached response body (jsonb).
    /// </summary>
    public string ResponseBodyJson { get; set; } = string.Empty;

    public int HttpStatusCode { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ExpiresAt { get; set; } = DateTimeOffset.UtcNow.AddHours(24);
}
