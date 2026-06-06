namespace Dodostays.Api.Modules.Payments.Idempotency;

public interface IIdempotencyStore
{
    Task<IdempotencyEntry?> GetAsync(string keyHash, CancellationToken ct);
    Task SaveAsync(string keyHash, string scope, Guid? bookingId, string responseBodyJson, int httpStatusCode, DateTimeOffset expiresAt, CancellationToken ct);
}

public sealed record IdempotencyEntry(string ResponseBodyJson, int HttpStatusCode, DateTimeOffset ExpiresAt, DateTimeOffset CreatedAt);
