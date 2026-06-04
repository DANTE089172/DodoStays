using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Modules.Common.Database;
using Dodostays.Api.Modules.Common.Health;
using Dodostays.Api.Modules.Common.ProblemDetails;
using Dodostays.Api.Modules.Identity;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, lc) => lc
    .ReadFrom.Configuration(ctx.Configuration)
    .WriteTo.Console());

var connectionString = builder.Configuration.GetConnectionString("Postgres")
    ?? throw new InvalidOperationException("ConnectionStrings:Postgres is not set.");

builder.Services.AddDbContext<DodostaysDbContext>(opts =>
    opts.UseNpgsql(connectionString, npg => npg.UseNetTopologySuite()));

builder.Services.AddIdentityModule(builder.Configuration);

builder.Services.AddProblemDetails();
builder.Services.AddHealthChecks();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseSerilogRequestLogging();
app.UseDodostaysProblemDetails();
app.UseAuthentication();
app.UseAuthorization();

app.MapHealthCheckEndpoints();
app.MapIdentityEndpoints();

app.Run();

namespace Dodostays.Api
{
    public partial class Program;
}
