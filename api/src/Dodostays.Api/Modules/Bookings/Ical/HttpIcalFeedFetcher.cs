using Microsoft.Extensions.Options;

namespace Dodostays.Api.Modules.Bookings.Ical;

public sealed class HttpIcalFeedFetcher : IIcalFeedFetcher
{
    private readonly HttpClient _http;
    private readonly IcalOptions _options;

    public HttpIcalFeedFetcher(HttpClient http, IOptions<IcalOptions> options)
    {
        _http = http;
        _options = options.Value;
        _http.Timeout = _options.FetchTimeout;
        _http.DefaultRequestHeaders.UserAgent.ParseAdd("DodoStays/1.0 (+https://dodostays.com)");
    }

    public async Task<string> FetchAsync(string url, CancellationToken ct)
    {
        using var response = await _http.GetAsync(url, ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsStringAsync(ct);
    }
}
