using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Modules.Common.Database;
using Dodostays.Api.Modules.Payments.Domain;

namespace Dodostays.Api.Modules.Payments.Idempotency;

public sealed class DbIdempotencyStore : IIdempotencyStore
{
    private readonly DodostaysDbContext _dbContext;
    private readonly ILogger<DbIdempotencyStore> _logger;

    public DbIdempotencyStore(DodostaysDbContext dbContext, ILogger<DbIdempotencyStore> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    public async Task<IdempotencyEntry?> GetAsync(string keyHash, CancellationToken ct)
    {
        var entity = await _dbContext.IdempotencyKeys
            .SingleOrDefaultAsync(x => x.KeyHash == keyHash, ct);

        if (entity == null)
            return null;

        // Treat expired entries as cache miss
        if (entity.ExpiresAt < DateTimeOffset.UtcNow)
        {
            _logger.LogDebug("Idempotency key {KeyHash} expired at {ExpiresAt}", keyHash, entity.ExpiresAt);
            return null;
        }

        return new IdempotencyEntry(
            entity.ResponseBodyJson,
            entity.HttpStatusCode,
            entity.ExpiresAt,
            entity.CreatedAt);
    }

    public async Task SaveAsync(string keyHash, string scope, Guid? bookingId, string responseBodyJson, int httpStatusCode, DateTimeOffset expiresAt, CancellationToken ct)
    {
        var entity = new IdempotencyKey
        {
            Id = Guid.NewGuid(),
            KeyHash = keyHash,
            Scope = scope,
            BookingId = bookingId,
            ResponseBodyJson = responseBodyJson,
            HttpStatusCode = httpStatusCode,
            CreatedAt = DateTimeOffset.UtcNow,
            ExpiresAt = expiresAt
        };

        _dbContext.IdempotencyKeys.Add(entity);
        await _dbContext.SaveChangesAsync(ct);

        _logger.LogDebug("Saved idempotency key {KeyHash} for scope {Scope}, expires at {ExpiresAt}",
            keyHash, scope, expiresAt);
    }
}
