namespace Dodostays.Api.Modules.Search.DriveTime;

public sealed class DriveTimeOptions
{
    public string Provider { get; set; } = "Haversine";
    public string? MapboxAccessToken { get; set; }
    public double AverageDrivingKmh { get; set; } = 35.0;
}
