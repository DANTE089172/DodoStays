namespace Dodostays.Api.Contracts.Waitlist;

/// <summary>
/// Aggregate, non-PII counts for the waitlist. Safe to expose anonymously —
/// used for "join N others" social proof on the landing page.
/// </summary>
public sealed record WaitlistStatsDto(
    int Total,
    int Travellers,
    int Hosts);
