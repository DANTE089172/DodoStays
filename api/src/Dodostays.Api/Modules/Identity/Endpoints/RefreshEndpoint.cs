using Microsoft.AspNetCore.Identity;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Identity.Auth;
using Dodostays.Api.Modules.Identity.Domain;

namespace Dodostays.Api.Modules.Identity.Endpoints;

internal static class RefreshEndpoint
{
    public static RouteHandlerBuilder MapRefresh(this IEndpointRouteBuilder app)
    {
        return app.MapPost("/api/identity/refresh", HandleAsync).AllowAnonymous();
    }

    private static async Task<IResult> HandleAsync(
        UserManager<DodostaysUser> users,
        JwtTokenIssuer issuer,
        RefreshTokenStore refreshStore,
        HttpContext http,
        CancellationToken ct)
    {
        var rt = http.Request.Cookies[SignUpEndpoint.RefreshTokenCookieName];
        if (string.IsNullOrEmpty(rt)) return Results.Unauthorized();

        var token = await refreshStore.FindActiveAsync(rt, ct);
        if (token is null) return Results.Unauthorized();

        var user = await users.FindByIdAsync(token.UserId.ToString());
        if (user is null) return Results.Unauthorized();

        var (raw, _) = await refreshStore.RotateAsync(token, ct);
        var (accessToken, expiresAt) = issuer.IssueAccessToken(user);
        SignUpEndpoint.SetAuthCookies(http, accessToken, expiresAt, raw, issuer.RefreshTokenLifetime);

        var dto = new UserDto(user.Id, user.Email!, user.DisplayName, user.PreferredLanguage, user.Role, user.KycStatus, user.TwoFactorEnabled);
        return Results.Ok(new AuthResponse(accessToken, expiresAt, dto));
    }
}
