namespace Dodostays.Api.Contracts.Waitlist;

/// <summary>
/// Which side of the marketplace a waitlist signup is interested in.
/// A single person can join twice (once per audience) — e.g. a host who
/// also wants to travel.
/// </summary>
public enum WaitlistAudience
{
    /// <summary>Guest / traveller who wants early access to book stays.</summary>
    Traveller = 0,

    /// <summary>Property owner who wants to list a place.</summary>
    Host = 1,
}
