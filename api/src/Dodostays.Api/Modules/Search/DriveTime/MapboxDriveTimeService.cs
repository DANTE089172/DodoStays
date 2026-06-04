using Microsoft.Extensions.Options;
using Dodostays.Api.Contracts.Search;

namespace Dodostays.Api.Modules.Search.DriveTime;

public sealed class MapboxDriveTimeService : IDriveTimeService
{
    private readonly DriveTimeOptions _options;
    private readonly HttpClient _http;
    private readonly HaversineDriveTimeService _fallback;

    public MapboxDriveTimeService(HttpClient http, IOptions<DriveTimeOptions> options)
    {
        _http = http;
        _options = options.Value;
        if (string.IsNullOrWhiteSpace(_options.MapboxAccessToken))
            throw new InvalidOperationException("DriveTime:MapboxAccessToken is required when provider is Mapbox.");
        _fallback = new HaversineDriveTimeService(options);
    }

    public Task<int> EstimateMinutesAsync(double originLat, double originLng, IReadOnlyList<Anchor> anchors, CancellationToken ct)
    {
        // Real Mapbox Directions API integration deferred until production launch readiness.
        // For now, delegate to the Haversine fallback so the system stays usable.
        return _fallback.EstimateMinutesAsync(originLat, originLng, anchors, ct);
    }
}
