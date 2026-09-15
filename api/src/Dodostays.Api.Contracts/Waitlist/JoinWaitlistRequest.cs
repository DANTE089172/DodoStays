namespace Dodostays.Api.Contracts.Waitlist;

/// <summary>
/// Payload for joining the pre-launch waitlist. Only <see cref="Email"/> and
/// <see cref="Audience"/> are required; the rest are optional signals we use to
/// segment demand and seed the marketplace.
/// </summary>
public sealed record JoinWaitlistRequest(
    string Email,
    WaitlistAudience Audience,
    string? Name = null,
    string? Region = null,
    string? Message = null,
    string? Locale = null,
    string? Source = null);
