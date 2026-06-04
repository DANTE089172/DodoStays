using Dodostays.Api.Modules.Identity.Auth;

namespace Dodostays.Api.Modules.Identity.Endpoints;

internal static class SignOutEndpoint
{
    public static RouteHandlerBuilder MapSignOutEndpoint(this IEndpointRouteBuilder app)
    {
        return app.MapPost("/api/identity/signout", HandleAsync).RequireAuthorization();
    }

    private static async Task<IResult> HandleAsync(
        RefreshTokenStore refreshStore,
        HttpContext http,
        CancellationToken ct)
    {
        var rt = http.Request.Cookies[SignUpEndpoint.RefreshTokenCookieName];
        if (!string.IsNullOrEmpty(rt))
        {
            var token = await refreshStore.FindActiveAsync(rt, ct);
            if (token is not null) await refreshStore.RotateAsync(token, ct);
        }

        http.Response.Cookies.Delete(SignUpEndpoint.AccessTokenCookieName);
        http.Response.Cookies.Delete(SignUpEndpoint.RefreshTokenCookieName, new CookieOptions { Path = "/api/identity" });
        return Results.NoContent();
    }
}
