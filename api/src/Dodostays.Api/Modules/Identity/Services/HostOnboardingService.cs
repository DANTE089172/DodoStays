using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Common.Database;
using Dodostays.Api.Modules.Identity.Domain;

namespace Dodostays.Api.Modules.Identity.Services;

public sealed class HostOnboardingService
{
    private readonly DodostaysDbContext _db;

    public HostOnboardingService(DodostaysDbContext db) => _db = db;

    public async Task<HostProfileDto> UpsertAsync(Guid userId, HostProfileDto dto, CancellationToken ct)
    {
        var user = await _db.Users.SingleAsync(u => u.Id == userId, ct);
        if (user.Role != UserRole.Host)
        {
            user.Role = UserRole.Host;
        }

        var existing = await _db.HostProfiles.SingleOrDefaultAsync(h => h.UserId == userId, ct);
        if (existing is null)
        {
            existing = new HostProfile { UserId = userId, CreatedAt = DateTimeOffset.UtcNow };
            _db.HostProfiles.Add(existing);
        }

        existing.LegalName = dto.LegalName;
        existing.TamLicenseNumber = dto.TamLicenseNumber;
        existing.VatNumber = dto.VatNumber;
        existing.BankAccountLast4 = dto.BankAccountLast4;
        existing.BankName = dto.BankName;
        existing.UpdatedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync(ct);

        return new HostProfileDto(userId, existing.LegalName, existing.TamLicenseNumber,
            existing.VatNumber, existing.BankAccountLast4, existing.BankName);
    }

    public async Task<HostProfileDto?> GetAsync(Guid userId, CancellationToken ct)
    {
        var hp = await _db.HostProfiles.AsNoTracking().SingleOrDefaultAsync(h => h.UserId == userId, ct);
        return hp is null ? null : new HostProfileDto(hp.UserId, hp.LegalName, hp.TamLicenseNumber, hp.VatNumber, hp.BankAccountLast4, hp.BankName);
    }
}
