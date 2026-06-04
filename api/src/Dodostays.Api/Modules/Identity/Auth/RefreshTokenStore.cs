using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Modules.Common.Database;
using Dodostays.Api.Modules.Identity.Domain;

namespace Dodostays.Api.Modules.Identity.Auth;

public sealed class RefreshTokenStore
{
    private readonly DodostaysDbContext _db;
    private readonly JwtTokenIssuer _issuer;

    public RefreshTokenStore(DodostaysDbContext db, JwtTokenIssuer issuer)
    {
        _db = db;
        _issuer = issuer;
    }

    public async Task<(string Raw, RefreshToken Stored)> CreateAsync(Guid userId, CancellationToken ct)
    {
        var (raw, hash) = _issuer.IssueRefreshToken();
        var token = new RefreshToken
        {
            UserId = userId,
            TokenHash = hash,
            ExpiresAt = DateTimeOffset.UtcNow.Add(_issuer.RefreshTokenLifetime)
        };
        _db.RefreshTokens.Add(token);
        await _db.SaveChangesAsync(ct);
        return (raw, token);
    }

    public async Task<RefreshToken?> FindActiveAsync(string raw, CancellationToken ct)
    {
        var hash = _issuer.HashRefreshToken(raw);
        var token = await _db.RefreshTokens
            .SingleOrDefaultAsync(t => t.TokenHash == hash, ct);
        return token is { } t && t.IsActive ? t : null;
    }

    public async Task<(string Raw, RefreshToken Stored)> RotateAsync(RefreshToken existing, CancellationToken ct)
    {
        var (raw, replacement) = await CreateAsync(existing.UserId, ct);
        existing.Revoke();
        existing.ReplacedByTokenId = replacement.Id;
        await _db.SaveChangesAsync(ct);
        return (raw, replacement);
    }

    public async Task RevokeAllForUserAsync(Guid userId, CancellationToken ct)
    {
        var active = await _db.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null)
            .ToListAsync(ct);
        var now = DateTimeOffset.UtcNow;
        foreach (var t in active) t.RevokedAt = now;
        await _db.SaveChangesAsync(ct);
    }
}
