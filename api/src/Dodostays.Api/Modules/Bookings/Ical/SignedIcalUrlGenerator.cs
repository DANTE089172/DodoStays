using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;

namespace Dodostays.Api.Modules.Bookings.Ical;

public sealed class SignedIcalUrlGenerator
{
    private readonly IcalOptions _options;

    public SignedIcalUrlGenerator(IOptions<IcalOptions> options)
    {
        _options = options.Value;
        if (string.IsNullOrWhiteSpace(_options.SigningKey) || _options.SigningKey.Length < 32)
            throw new InvalidOperationException("Ical:SigningKey must be at least 32 characters.");
        if (string.IsNullOrWhiteSpace(_options.FeedBaseUrl))
            throw new InvalidOperationException("Ical:FeedBaseUrl must be configured.");
    }

    public string GenerateUrl(Guid listingId)
    {
        var token = Sign(listingId);
        var baseUrl = _options.FeedBaseUrl.TrimEnd('/');
        return $"{baseUrl}/ical/listings/{listingId}.ics?token={token}";
    }

    public bool Verify(Guid listingId, string? token)
    {
        if (string.IsNullOrWhiteSpace(token)) return false;
        var expected = Sign(listingId);
        return CryptographicOperations.FixedTimeEquals(
            Encoding.ASCII.GetBytes(expected),
            Encoding.ASCII.GetBytes(token));
    }

    private string Sign(Guid listingId)
    {
        var payload = Encoding.UTF8.GetBytes(listingId.ToString("N"));
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_options.SigningKey));
        var hash = hmac.ComputeHash(payload);
        return Convert.ToHexString(hash).ToLowerInvariant();
    }
}
