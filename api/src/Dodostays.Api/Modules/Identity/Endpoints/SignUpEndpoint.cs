using FluentValidation;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Identity.Auth;
using Dodostays.Api.Modules.Identity.Domain;
using Dodostays.Api.Modules.Identity.Kyc;

namespace Dodostays.Api.Modules.Identity.Endpoints;

internal static class SignUpEndpoint
{
    public const string AccessTokenCookieName = "ds_at";
    public const string RefreshTokenCookieName = "ds_rt";

    public static RouteHandlerBuilder MapSignUp(this IEndpointRouteBuilder app)
    {
        return app.MapPost("/api/identity/signup", HandleAsync).AllowAnonymous();
    }

    private static async Task<IResult> HandleAsync(
        [FromBody] SignUpRequest request,
        IValidator<SignUpRequest> validator,
        UserManager<DodostaysUser> users,
        JwtTokenIssuer issuer,
        RefreshTokenStore refreshStore,
        IKycVerifier kyc,
        HttpContext http,
        CancellationToken ct)
    {
        var validation = await validator.ValidateAsync(request, ct);
        if (!validation.IsValid)
            return Results.ValidationProblem(validation.ToDictionary());

        if (request.IntendedRole == UserRole.Admin || request.IntendedRole == UserRole.Inspector)
            return Results.Forbid();

        var existing = await users.FindByEmailAsync(request.Email);
        if (existing is not null)
            return Results.Problem(statusCode: StatusCodes.Status409Conflict, title: "Email already registered.");

        var user = new DodostaysUser
        {
            Id = Guid.NewGuid(),
            UserName = request.Email,
            Email = request.Email,
            DisplayName = request.DisplayName,
            PreferredLanguage = request.PreferredLanguage.ToLowerInvariant(),
            Role = request.IntendedRole,
            KycStatus = KycStatus.Pending
        };

        var created = await users.CreateAsync(user, request.Password);
        if (!created.Succeeded)
        {
            var errors = created.Errors.ToDictionary(e => e.Code, e => new[] { e.Description });
            return Results.ValidationProblem(errors);
        }

        var kycResult = await kyc.StartAsync(user.Id, user.Email!, user.DisplayName, ct);
        user.KycStatus = kycResult.Status;
        await users.UpdateAsync(user);

        var (accessToken, expiresAt) = issuer.IssueAccessToken(user);
        var (refreshRaw, _) = await refreshStore.CreateAsync(user.Id, ct);

        SetAuthCookies(http, accessToken, expiresAt, refreshRaw, issuer.RefreshTokenLifetime);

        var dto = new UserDto(user.Id, user.Email!, user.DisplayName, user.PreferredLanguage, user.Role, user.KycStatus, user.TwoFactorEnabled);
        return Results.Ok(new AuthResponse(accessToken, expiresAt, dto));
    }

    public static void SetAuthCookies(HttpContext http, string accessToken, DateTimeOffset accessExpiresAt, string refreshToken, TimeSpan refreshLifetime)
    {
        var httpsOnly = !http.Request.Host.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase);
        var atOpts = new CookieOptions
        {
            HttpOnly = false,
            Secure = httpsOnly,
            SameSite = SameSiteMode.Lax,
            Expires = accessExpiresAt
        };
        var rtOpts = new CookieOptions
        {
            HttpOnly = true,
            Secure = httpsOnly,
            SameSite = SameSiteMode.Strict,
            Expires = DateTimeOffset.UtcNow.Add(refreshLifetime),
            Path = "/api/identity"
        };
        http.Response.Cookies.Append(AccessTokenCookieName, accessToken, atOpts);
        http.Response.Cookies.Append(RefreshTokenCookieName, refreshToken, rtOpts);
    }
}
