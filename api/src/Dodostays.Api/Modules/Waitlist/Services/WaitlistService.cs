using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Contracts.Waitlist;
using Dodostays.Api.Modules.Common.Database;
using Dodostays.Api.Modules.Waitlist.Domain;

namespace Dodostays.Api.Modules.Waitlist.Services;

public sealed class WaitlistService
{
    private readonly DodostaysDbContext _db;

    public WaitlistService(DodostaysDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Adds an email to the waitlist for the given audience. Idempotent: a
    /// repeat signup for the same email+audience returns the existing record
    /// with <c>AlreadyOnList = true</c> rather than erroring, so the visitor
    /// always sees a friendly confirmation.
    /// </summary>
    public async Task<WaitlistSignupDto> JoinAsync(JoinWaitlistRequest req, CancellationToken ct)
    {
        var email = req.Email.Trim().ToLowerInvariant();

        var existing = await _db.WaitlistSignups
            .SingleOrDefaultAsync(w => w.Email == email && w.Audience == req.Audience, ct);

        if (existing is not null)
        {
            return new WaitlistSignupDto(
                existing.Id, existing.Email, existing.Audience, existing.CreatedAt, AlreadyOnList: true);
        }

        var signup = new WaitlistSignup
        {
            Email = email,
            Audience = req.Audience,
            Name = Clean(req.Name),
            Region = Clean(req.Region)?.ToLowerInvariant(),
            Message = Clean(req.Message),
            Locale = Clean(req.Locale)?.ToLowerInvariant(),
            Source = Clean(req.Source),
        };

        _db.WaitlistSignups.Add(signup);

        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // Lost a race against a concurrent identical signup — the unique
            // index caught it. Re-read and treat as already-on-list.
            var raced = await _db.WaitlistSignups
                .SingleAsync(w => w.Email == email && w.Audience == req.Audience, ct);
            return new WaitlistSignupDto(
                raced.Id, raced.Email, raced.Audience, raced.CreatedAt, AlreadyOnList: true);
        }

        return new WaitlistSignupDto(
            signup.Id, signup.Email, signup.Audience, signup.CreatedAt, AlreadyOnList: false);
    }

    /// <summary>Aggregate counts for social proof. No PII.</summary>
    public async Task<WaitlistStatsDto> GetStatsAsync(CancellationToken ct)
    {
        var byAudience = await _db.WaitlistSignups
            .GroupBy(w => w.Audience)
            .Select(g => new { Audience = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var travellers = byAudience.FirstOrDefault(x => x.Audience == WaitlistAudience.Traveller)?.Count ?? 0;
        var hosts = byAudience.FirstOrDefault(x => x.Audience == WaitlistAudience.Host)?.Count ?? 0;

        return new WaitlistStatsDto(travellers + hosts, travellers, hosts);
    }

    private static string? Clean(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;
        return value.Trim();
    }
}
