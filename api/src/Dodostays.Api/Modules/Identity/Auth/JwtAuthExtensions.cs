using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

namespace Dodostays.Api.Modules.Identity.Auth;

public static class JwtAuthExtensions
{
    public static IServiceCollection AddDodostaysJwtAuth(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<JwtOptions>(configuration.GetSection("Jwt"));
        services.AddSingleton<JwtTokenIssuer>();

        var jwt = configuration.GetSection("Jwt").Get<JwtOptions>()
            ?? throw new InvalidOperationException("Jwt configuration section missing.");

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(opts =>
            {
                opts.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidIssuer = jwt.Issuer,
                    ValidAudience = jwt.Audience,
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey)),
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateIssuerSigningKey = true,
                    ValidateLifetime = true,
                    ClockSkew = TimeSpan.FromSeconds(30),
                    NameClaimType = "sub",
                    RoleClaimType = "role"
                };
            });

        services.AddAuthorization();
        return services;
    }
}
