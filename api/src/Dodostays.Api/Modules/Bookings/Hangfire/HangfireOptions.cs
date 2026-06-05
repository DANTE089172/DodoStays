namespace Dodostays.Api.Modules.Bookings.Hangfire;

public sealed class HangfireOptions
{
    public bool DashboardEnabled { get; set; } = false;
    public string DashboardPath { get; set; } = "/jobs";
}
