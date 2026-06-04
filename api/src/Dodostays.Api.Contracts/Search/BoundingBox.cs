using System.Globalization;

namespace Dodostays.Api.Contracts.Search;

public sealed record BoundingBox(double SouthLat, double WestLng, double NorthLat, double EastLng)
{
    private const double MauritiusSouth = -20.55;
    private const double MauritiusNorth = -19.94;
    private const double MauritiusWest = 57.29;
    private const double MauritiusEast = 57.83;

    public bool Contains(double lat, double lng) =>
        lat >= SouthLat && lat <= NorthLat && lng >= WestLng && lng <= EastLng;

    public bool IsWithinMauritius() =>
        SouthLat >= MauritiusSouth - 0.5 &&
        NorthLat <= MauritiusNorth + 0.5 &&
        WestLng >= MauritiusWest - 0.5 &&
        EastLng <= MauritiusEast + 0.5;

    public static bool TryParse(string? value, out BoundingBox? bbox)
    {
        bbox = null;
        if (string.IsNullOrWhiteSpace(value)) return false;
        var parts = value.Split(',', StringSplitOptions.TrimEntries);
        if (parts.Length != 4) return false;
        if (!double.TryParse(parts[0], NumberStyles.Float, CultureInfo.InvariantCulture, out var sLat)) return false;
        if (!double.TryParse(parts[1], NumberStyles.Float, CultureInfo.InvariantCulture, out var wLng)) return false;
        if (!double.TryParse(parts[2], NumberStyles.Float, CultureInfo.InvariantCulture, out var nLat)) return false;
        if (!double.TryParse(parts[3], NumberStyles.Float, CultureInfo.InvariantCulture, out var eLng)) return false;
        bbox = new BoundingBox(sLat, wLng, nLat, eLng);
        return true;
    }
}
