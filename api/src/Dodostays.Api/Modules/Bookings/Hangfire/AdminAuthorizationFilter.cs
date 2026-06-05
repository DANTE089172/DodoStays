using global::Hangfire.Dashboard;

namespace Dodostays.Api.Modules.Bookings.Hangfire;

internal sealed class AdminAuthorizationFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var http = context.GetHttpContext();
        if (http?.User?.Identity?.IsAuthenticated != true) return false;
        return http.User.IsInRole("Admin")
            || (http.User.FindFirst("role")?.Value == "Admin");
    }
}
