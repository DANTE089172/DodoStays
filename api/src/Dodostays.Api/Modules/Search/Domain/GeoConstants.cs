namespace Dodostays.Api.Modules.Search.Domain;

public static class GeoConstants
{
    public const double MauritiusSouth = -20.55;
    public const double MauritiusNorth = -19.94;
    public const double MauritiusWest = 57.29;
    public const double MauritiusEast = 57.83;

    public static readonly Dictionary<string, (double Lat, double Lng)> RegionCentroids = new(StringComparer.OrdinalIgnoreCase)
    {
        ["grand-baie"] = (-20.0117, 57.5800),
        ["flic-en-flac"] = (-20.2667, 57.3667),
        ["tamarin"] = (-20.3220, 57.3690),
        ["trou-aux-biches"] = (-20.0394, 57.5481),
        ["pereybere"] = (-19.9967, 57.5878),
        ["belle-mare"] = (-20.1900, 57.7700),
        ["le-morne"] = (-20.4500, 57.3167),
        ["blue-bay"] = (-20.4456, 57.7100),
        ["albion"] = (-20.2117, 57.4039)
    };
}
