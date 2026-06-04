using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Common.Database;
using Dodostays.Api.Modules.Identity.Domain;

namespace Dodostays.Api.Modules.Identity.Services;

internal sealed class UserContext : IUserContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly DodostaysDbContext _db;

    public UserContext(IHttpContextAccessor httpContextAccessor, DodostaysDbContext db)
    {
        _httpContextAccessor = httpContextAccessor;
        _db = db;
    }

    public Guid? CurrentUserId
    {
        get
        {
            var sub = _httpContextAccessor.HttpContext?.User.FindFirst("sub")?.Value
                ?? _httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(sub, out var id) ? id : null;
        }
    }

    public async Task<UserDto?> GetCurrentUserAsync(CancellationToken ct = default)
    {
        var id = CurrentUserId;
        if (id is null) return null;
        var user = await _db.Set<DodostaysUser>().AsNoTracking()
            .SingleOrDefaultAsync(u => u.Id == id.Value, ct);
        if (user is null) return null;
        return new UserDto(
            user.Id,
            user.Email ?? string.Empty,
            user.DisplayName,
            user.PreferredLanguage,
            user.Role,
            user.KycStatus,
            user.TwoFactorEnabled);
    }

    public async Task<UserDto> RequireUserAsync(CancellationToken ct = default)
    {
        var user = await GetCurrentUserAsync(ct);
        return user ?? throw new UnauthorizedAccessException("Authentication required.");
    }
}
