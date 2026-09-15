namespace Dodostays.Api.Contracts.Waitlist;

/// <summary>Confirmation returned after a successful waitlist join.</summary>
public sealed record WaitlistSignupDto(
    Guid Id,
    string Email,
    WaitlistAudience Audience,
    DateTimeOffset CreatedAt,
    bool AlreadyOnList);
