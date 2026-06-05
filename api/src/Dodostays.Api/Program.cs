using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Modules.Common.Database;
using Dodostays.Api.Modules.Common.Health;
using Dodostays.Api.Modules.Common.ProblemDetails;
using Dodostays.Api.Modules.Bookings;
using Dodostays.Api.Modules.Bookings.Hangfire;
using Dodostays.Api.Modules.Identity;
using Dodostays.Api.Modules.Listings;
using Dodostays.Api.Modules.Payments;
using Dodostays.Api.Modules.Search;
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
builder.Services.AddSearchModule(builder.Configuration);
builder.Services.AddListingsModule(builder.Configuration);
builder.Services.AddBookingsModule(builder.Configuration);
builder.Services.AddPaymentsModule(builder.Configuration);

const string CorsPolicyName = "DodostaysFrontend";
builder.Services.AddCors(opts =>
{
    opts.AddPolicy(CorsPolicyName, policy =>
    {
        var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
            ?? new[] { "http://localhost:3000" };
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

builder.Services.AddProblemDetails();
builder.Services.ConfigureHttpJsonOptions(opts =>
{
    opts.SerializerOptions.Converters.Add(
        new System.Text.Json.Serialization.JsonStringEnumConverter());
});
builder.Services.AddHealthChecks();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (!app.Environment.IsEnvironment("Testing"))
{
    var recurringJobManager = app.Services.GetService<global::Hangfire.IRecurringJobManager>();
    if (recurringJobManager is not null)
    {
        global::Hangfire.RecurringJobManagerExtensions.AddOrUpdate<Dodostays.Api.Modules.Bookings.Ical.IcalSyncJob>(
            recurringJobManager,
            "ical-sync",
            job => job.RunAsync(CancellationToken.None),
            "*/15 * * * *");
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

var photosPath = Path.Combine(builder.Environment.ContentRootPath, "wwwroot", "photos");
Directory.CreateDirectory(photosPath);
app.UseStaticFiles();

app.UseSerilogRequestLogging();
app.UseDodostaysProblemDetails();
app.UseCors(CorsPolicyName);
app.UseAuthentication();
app.UseAuthorization();
app.UseHangfireDashboardIfEnabled();

app.MapHealthCheckEndpoints();
app.MapIdentityEndpoints();
app.MapListingsEndpoints();
app.MapBookingsEndpoints();
app.MapPaymentsEndpoints();
app.MapSearchEndpoints();

app.Run();

namespace Dodostays.Api
{
    public partial class Program;
}
