namespace Dodostays.Api.Modules.Common.ProblemDetails;

public static class ProblemDetailsExtensions
{
    public static IApplicationBuilder UseDodostaysProblemDetails(this IApplicationBuilder app)
    {
        app.UseExceptionHandler();
        app.UseStatusCodePages();
        return app;
    }
}
