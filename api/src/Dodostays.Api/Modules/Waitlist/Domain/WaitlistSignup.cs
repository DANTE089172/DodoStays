using Dodostays.Api.Contracts.Waitlist;

namespace Dodostays.Api.Modules.Waitlist.Domain;

/// <summary>
/// A pre-launch waitlist signup. Persisted so we own the demand signal
/// (no third-party email tool) and can segment travellers vs hosts.
/// </summary>
public class WaitlistSignup
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Normalised (trimmed, lower-cased) email address.</summary>
    public string Email { get; set; } = string.Empty;

    public WaitlistAudience Audience { get; set; }

    /// <summary>Optional display name.</summary>
    public string? Name { get; set; }

    /// <summary>
    /// Optional region of interest — where a traveller wants to stay or where a
    /// host's property is. Free text, kept lower-cased for loose grouping.
    /// </summary>
    public string? Region { get; set; }

    /// <summary>Optional free-text note from the signup form.</summary>
    public string? Message { get; set; }

    /// <summary>Locale the visitor signed up in (en/fr/ru/de).</summary>
    public string? Locale { get; set; }

    /// <summary>Optional marketing attribution (utm/referrer).</summary>
    public string? Source { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
