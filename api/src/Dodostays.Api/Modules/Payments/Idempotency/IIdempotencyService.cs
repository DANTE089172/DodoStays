namespace Dodostays.Api.Modules.Payments.Idempotency;

public interface IIdempotencyService
{
    /// <summary>
    /// Get-or-execute pattern. If a cached response exists for (scope, headerKey),
    /// returns the cached body + status. Otherwise invokes the factory, persists the result,
    /// and returns the freshly-computed body + status.
    ///
    /// If headerKey is null or whitespace, factory is always invoked, NO caching applied.
    /// </summary>
    Task<IdempotentResult<TResult>> GetOrExecuteAsync<TResult>(
        string? headerKey,
        string scope,
        Guid? bookingId,
        Func<CancellationToken, Task<(TResult body, int httpStatusCode)>> factory,
        TimeSpan? ttl = null,
        CancellationToken ct = default);
}

public sealed record IdempotentResult<TResult>(TResult Body, int HttpStatusCode, bool WasCached);
