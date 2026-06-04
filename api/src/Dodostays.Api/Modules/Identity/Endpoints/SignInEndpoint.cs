using FluentValidation;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Identity.Auth;
using Dodostays.Api.Modules.Identity.Domain;

namespace Dodostays.Api.Modules.Identity.Endpoints;

internal static class SignInEndpoint
{
    public static RouteHandlerBuilder MapSignIn(this IEndpointRouteBuilder app)
    {
        return app.MapPost("/api/identity/signin", HandleAsync).AllowAnonymous();
    }

    private static async Task<IResult> HandleAsync(
        [FromBody] SignInRequest request,
        IValidator<SignInRequest> validator,
        UserManager<DodostaysUser> users,
        JwtTokenIssuer issuer,
        RefreshTokenStore refreshStore,
        HttpContext http,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            return Results.ValidationProblem(validation.ToDictionary());

        var user = await users.FindByEmailAsync(request.Email);
        if (user is null) return Results.Unauthorized();

        var ok = await users.CheckPasswordAsync(user, request.Password);
        if (!ok) return Results.Unauthorized();

        var (accessToken, expiresAt) = issuer.IssueAccessToken(user);
        var (refreshRaw, _) = await refreshStore.CreateAsync(user.Id, ct);
        SignUpEndpoint.SetAuthCookies(http, accessToken, expiresAt, refreshRaw, issuer.RefreshTokenLifetime);

        var dto = new UserDto(user.Id, user.Email!, user.DisplayName, user.PreferredLanguage, user.Role, user.KycStatus, user.TwoFactorEnabled);
        return Results.Ok(new AuthResponse(accessToken, expiresAt, dto));
    }
}
