using Microsoft.Extensions.Options;
using Dodostays.Api.Contracts.Search;

namespace Dodostays.Api.Modules.Search.DriveTime;

public sealed class HaversineDriveTimeService : IDriveTimeService
{
    private readonly double _kmh;

    public HaversineDriveTimeService() : this(35.0) { }

    public HaversineDriveTimeService(IOptions<DriveTimeOptions> options) : this(options.Value.AverageDrivingKmh) { }

    private HaversineDriveTimeService(double averageDrivingKmh) => _kmh = averageDrivingKmh;

    public Task<int> EstimateMinutesAsync(double originLat, double originLng, IReadOnlyList<Anchor> anchors, CancellationToken ct)
    {
        if (anchors is null || anchors.Count == 0) return Task.FromResult(int.MaxValue);

        var minMinutes = int.MaxValue;
        foreach (var a in anchors)
        {
            var km = HaversineKm(originLat, originLng, a.Lat, a.Lng);
            // Mauritius roads aren't straight; multiply by 1.4 for realistic driving distance
            var drivingKm = km * 1.4;
            var hours = drivingKm / _kmh;
            var minutes = (int)Math.Round(hours * 60);
            if (minutes < minMinutes) minMinutes = minutes;
        }
        return Task.FromResult(minMinutes);
    }

    private static double HaversineKm(double lat1, double lng1, double lat2, double lng2)
    {
        const double R = 6371.0;
        var dLat = (lat2 - lat1) * Math.PI / 180.0;
        var dLng = (lng2 - lng1) * Math.PI / 180.0;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
              + Math.Cos(lat1 * Math.PI / 180.0) * Math.Cos(lat2 * Math.PI / 180.0)
              * Math.Sin(dLng / 2) * Math.Sin(dLng / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return R * c;
    }
}
