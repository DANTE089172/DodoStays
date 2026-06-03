# DodoStays Plan 00 — Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the DodoStays repo, .NET 9 modular monolith skeleton, PostgreSQL+PostGIS local infra, base authentication, CI/CD pipeline, and deployment to Hetzner — producing a "hello world" API that passes auth, persists to Postgres, and is reachable via a public URL.

**Architecture:** Single ASP.NET Core 9 web project organized as a modular monolith — each business module is its own folder with public C# interfaces only, enforced by namespace conventions. PostgreSQL 16 + PostGIS 3.4 in Docker locally, Hetzner managed Postgres in production. Next.js 15 frontend in a separate `web/` folder. Deployed via GitHub Actions → Docker → Hetzner CX42 over SSH.

**Tech Stack:**
- Backend: .NET 9, ASP.NET Core, Entity Framework Core 9, Npgsql + Npgsql.EntityFrameworkCore.PostgreSQL.NetTopologySuite, FluentValidation, Serilog, Hangfire (deferred to Plan 03)
- Frontend: Next.js 15 (App Router), React 19, TypeScript 5.6, Tailwind CSS 4, next-intl (i18n)
- DB: PostgreSQL 16 + PostGIS 3.4
- Auth: ASP.NET Core Identity + JWT
- Infra: Docker, Docker Compose (local), GitHub Actions (CI/CD), Hetzner Cloud (CX42 + managed Postgres)
- Quality: xUnit, Testcontainers, Playwright (frontend), Roslyn analyzers, EditorConfig

---

## File Structure

This plan creates the following layout. Subsequent plans (01-06) add modules and pages in their respective folders.

```
C:/temp/Dodostays/
├── .editorconfig
├── .gitignore
├── .github/
│   └── workflows/
│       ├── ci-backend.yml
│       ├── ci-frontend.yml
│       └── deploy.yml
├── docker-compose.yml                 # local Postgres+PostGIS
├── docs/
│   ├── specs/                         # already exists (spec from brainstorming)
│   └── plans/                         # this plan + future plans
├── api/
│   ├── Dodostays.sln
│   ├── Directory.Build.props          # shared MSBuild config
│   ├── Directory.Packages.props       # central package version mgmt
│   ├── src/
│   │   ├── Dodostays.Api/             # ASP.NET Core entrypoint
│   │   │   ├── Dodostays.Api.csproj
│   │   │   ├── Program.cs
│   │   │   ├── appsettings.json
│   │   │   ├── appsettings.Development.json
│   │   │   ├── Dockerfile
│   │   │   └── Modules/
│   │   │       ├── Identity/         # populated in Plan 01
│   │   │       ├── Listings/         # populated in Plan 02
│   │   │       ├── Bookings/         # populated in Plan 03
│   │   │       ├── Payments/         # populated in Plan 04
│   │   │       ├── Messaging/        # populated in Plan 05
│   │   │       └── Common/           # cross-cutting infra
│   │   │           ├── Auth/
│   │   │           │   └── JwtAuthExtensions.cs
│   │   │           ├── Database/
│   │   │           │   ├── DodostaysDbContext.cs
│   │   │           │   ├── DesignTimeDbContextFactory.cs
│   │   │           │   └── Migrations/
│   │   │           ├── Health/
│   │   │           │   └── HealthCheckEndpoints.cs
│   │   │           └── ProblemDetails/
│   │   │               └── ProblemDetailsExtensions.cs
│   │   └── Dodostays.Api.Contracts/  # public DTOs, only thing other modules expose
│   │       └── Dodostays.Api.Contracts.csproj
│   └── tests/
│       ├── Dodostays.Api.Tests/      # unit tests
│       │   └── Dodostays.Api.Tests.csproj
│       └── Dodostays.Api.IntegrationTests/  # Testcontainers
│           └── Dodostays.Api.IntegrationTests.csproj
├── web/
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── .eslintrc.json
│   ├── playwright.config.ts
│   ├── public/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              # placeholder homepage; real UI in Plan 06
│   │   │   └── api/health/route.ts   # proxies to backend health
│   │   ├── lib/
│   │   │   └── api-client.ts
│   │   └── i18n/
│   │       ├── en.json
│   │       └── fr.json
│   └── e2e/
│       └── smoke.spec.ts
├── infra/
│   ├── deploy.sh                     # Hetzner SSH deploy script
│   └── docker-compose.prod.yml
└── README.md
```

**File responsibilities:**

- `api/Directory.Build.props` — shared compiler settings (nullable enable, treat warnings as errors, Roslyn analyzers).
- `api/Directory.Packages.props` — central NuGet versions; modules just reference packages by name.
- `Dodostays.Api/Program.cs` — minimal API entrypoint, wires modules via extension methods (one per module folder).
- `Dodostays.Api/Modules/Common/Database/DodostaysDbContext.cs` — single EF Core DbContext; modules add their `DbSet<>`s via partial class or extension. We use **partial class** (one file per module) so a module's tables live in its folder.
- `Dodostays.Api.Contracts` — only project that other modules can reference. Contains public DTOs/events. Enforces module boundaries.
- `web/src/app/api/health/route.ts` — Next.js API route that proxies to the backend's `/health` for end-to-end verification.
- `infra/deploy.sh` — copies docker-compose.prod.yml to Hetzner host, pulls new images, restarts.

---

## Task 0.1: Initialize repository

**Files:**
- Create: `C:/temp/Dodostays/.gitignore`
- Create: `C:/temp/Dodostays/.editorconfig`
- Create: `C:/temp/Dodostays/README.md`

- [ ] **Step 1: Initialize git repo and add remote**

```bash
cd C:/temp/Dodostays
git init -b master
git remote add origin https://github.com/DANTE089172/DodoStays.git
```

- [ ] **Step 2: Create `.gitignore`**

```gitignore
# .NET
**/bin/
**/obj/
*.user
*.suo
.vs/
artifacts/

# Node
node_modules/
.next/
out/
.env*.local
playwright-report/
test-results/

# OS
.DS_Store
Thumbs.db

# Editors
.idea/
.vscode/*
!.vscode/settings.json
!.vscode/extensions.json

# Secrets
*.pem
*.key
.env
secrets/
```

- [ ] **Step 3: Create `.editorconfig`**

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
trim_trailing_whitespace = true

[*.{cs,csproj,sln,props,targets}]
indent_size = 4

[*.{ts,tsx,js,jsx,json,yml,yaml,md}]
indent_size = 2

[*.cs]
dotnet_diagnostic.IDE0005.severity = warning
dotnet_diagnostic.CA2007.severity = none
csharp_style_namespace_declarations = file_scoped:warning
```

- [ ] **Step 4: Create `README.md`**

```markdown
# DodoStays

Mauritius short-term rental marketplace. See [docs/specs/](docs/specs/) for the design spec.

## Local development

```bash
docker compose up -d                  # Postgres + PostGIS
cd api && dotnet run --project src/Dodostays.Api
cd web && npm install && npm run dev
```

API: http://localhost:5080
Web: http://localhost:3000

## Project layout

- `api/` — ASP.NET Core 9 modular monolith
- `web/` — Next.js 15 PWA
- `docs/specs/` — design specs
- `docs/plans/` — implementation plans
- `infra/` — deployment scripts
```

- [ ] **Step 5: Commit**

```bash
git add .gitignore .editorconfig README.md
git commit -m "chore: initialize repo with editor config and README"
```

---

## Task 0.2: Create local Postgres + PostGIS via Docker Compose

**Files:**
- Create: `C:/temp/Dodostays/docker-compose.yml`

- [ ] **Step 1: Write `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgis/postgis:16-3.4
    container_name: dodostays-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: dodostays
      POSTGRES_USER: dodostays
      POSTGRES_PASSWORD: dev_only_change_me
    ports:
      - "5432:5432"
    volumes:
      - dodostays-postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dodostays -d dodostays"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  dodostays-postgres-data:
```

- [ ] **Step 2: Start the container**

Run: `docker compose up -d`

Expected: `dodostays-postgres` container running, healthy within 30 seconds.

- [ ] **Step 3: Verify PostGIS is loaded**

Run:
```bash
docker exec -it dodostays-postgres psql -U dodostays -d dodostays -c "CREATE EXTENSION IF NOT EXISTS postgis; SELECT PostGIS_Version();"
```

Expected: returns a version string like `3.4 USE_GEOS=1 USE_PROJ=1 USE_STATS=1`.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml
git commit -m "chore: add local Postgres+PostGIS via docker-compose"
```

---

## Task 0.3: Create .NET solution and shared MSBuild config

**Files:**
- Create: `C:/temp/Dodostays/api/Dodostays.sln`
- Create: `C:/temp/Dodostays/api/Directory.Build.props`
- Create: `C:/temp/Dodostays/api/Directory.Packages.props`

- [ ] **Step 1: Create solution**

```bash
cd C:/temp/Dodostays/api
dotnet new sln -n Dodostays
```

- [ ] **Step 2: Create `Directory.Build.props`**

```xml
<Project>
  <PropertyGroup>
    <TargetFramework>net9.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>
    <WarningsAsErrors />
    <WarningsNotAsErrors>CS1591</WarningsNotAsErrors>
    <LangVersion>latest</LangVersion>
    <AnalysisLevel>latest</AnalysisLevel>
    <EnforceCodeStyleInBuild>true</EnforceCodeStyleInBuild>
  </PropertyGroup>
</Project>
```

- [ ] **Step 3: Create `Directory.Packages.props` (central package management)**

```xml
<Project>
  <PropertyGroup>
    <ManagePackageVersionsCentrally>true</ManagePackageVersionsCentrally>
  </PropertyGroup>
  <ItemGroup>
    <PackageVersion Include="Microsoft.AspNetCore.OpenApi" Version="9.0.0" />
    <PackageVersion Include="Microsoft.AspNetCore.Authentication.JwtBearer" Version="9.0.0" />
    <PackageVersion Include="Microsoft.AspNetCore.Identity.EntityFrameworkCore" Version="9.0.0" />
    <PackageVersion Include="Microsoft.EntityFrameworkCore" Version="9.0.0" />
    <PackageVersion Include="Microsoft.EntityFrameworkCore.Design" Version="9.0.0" />
    <PackageVersion Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="9.0.0" />
    <PackageVersion Include="Npgsql.EntityFrameworkCore.PostgreSQL.NetTopologySuite" Version="9.0.0" />
    <PackageVersion Include="Serilog.AspNetCore" Version="8.0.3" />
    <PackageVersion Include="Serilog.Sinks.Console" Version="6.0.0" />
    <PackageVersion Include="FluentValidation.AspNetCore" Version="11.3.0" />
    <PackageVersion Include="Swashbuckle.AspNetCore" Version="7.2.0" />
    <PackageVersion Include="xunit" Version="2.9.2" />
    <PackageVersion Include="xunit.runner.visualstudio" Version="3.0.0" />
    <PackageVersion Include="Microsoft.NET.Test.Sdk" Version="17.12.0" />
    <PackageVersion Include="FluentAssertions" Version="6.12.2" />
    <PackageVersion Include="Testcontainers.PostgreSql" Version="4.0.0" />
    <PackageVersion Include="Microsoft.AspNetCore.Mvc.Testing" Version="9.0.0" />
  </ItemGroup>
</Project>
```

- [ ] **Step 4: Commit**

```bash
git add api/
git commit -m "chore: bootstrap .NET solution with central package management"
```

---

## Task 0.4: Create the Contracts project

**Files:**
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api.Contracts/Dodostays.Api.Contracts.csproj`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api.Contracts/AssemblyInfo.cs`

- [ ] **Step 1: Create Contracts project**

```bash
cd C:/temp/Dodostays/api
dotnet new classlib -n Dodostays.Api.Contracts -o src/Dodostays.Api.Contracts --framework net9.0
dotnet sln add src/Dodostays.Api.Contracts/Dodostays.Api.Contracts.csproj
rm src/Dodostays.Api.Contracts/Class1.cs
```

- [ ] **Step 2: Replace generated csproj content**

Overwrite `api/src/Dodostays.Api.Contracts/Dodostays.Api.Contracts.csproj`:

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <RootNamespace>Dodostays.Api.Contracts</RootNamespace>
  </PropertyGroup>
</Project>
```

- [ ] **Step 3: Build to verify**

Run: `dotnet build`

Expected: build succeeds, `Dodostays.Api.Contracts.dll` produced under `bin/`.

- [ ] **Step 4: Commit**

```bash
git add api/
git commit -m "chore: add Dodostays.Api.Contracts project"
```

---

## Task 0.5: Create the API project skeleton

**Files:**
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Dodostays.Api.csproj`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Program.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/appsettings.json`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/appsettings.Development.json`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Properties/launchSettings.json`

- [ ] **Step 1: Create the web project**

```bash
cd C:/temp/Dodostays/api
dotnet new web -n Dodostays.Api -o src/Dodostays.Api --framework net9.0
dotnet sln add src/Dodostays.Api/Dodostays.Api.csproj
dotnet add src/Dodostays.Api/Dodostays.Api.csproj reference src/Dodostays.Api.Contracts/Dodostays.Api.Contracts.csproj
```

- [ ] **Step 2: Replace `Dodostays.Api.csproj`**

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">
  <PropertyGroup>
    <RootNamespace>Dodostays.Api</RootNamespace>
    <UserSecretsId>dodostays-api-dev</UserSecretsId>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.AspNetCore.OpenApi" />
    <PackageReference Include="Microsoft.AspNetCore.Authentication.JwtBearer" />
    <PackageReference Include="Microsoft.AspNetCore.Identity.EntityFrameworkCore" />
    <PackageReference Include="Microsoft.EntityFrameworkCore" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.Design" />
    <PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" />
    <PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL.NetTopologySuite" />
    <PackageReference Include="Serilog.AspNetCore" />
    <PackageReference Include="Serilog.Sinks.Console" />
    <PackageReference Include="FluentValidation.AspNetCore" />
    <PackageReference Include="Swashbuckle.AspNetCore" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\Dodostays.Api.Contracts\Dodostays.Api.Contracts.csproj" />
  </ItemGroup>
</Project>
```

- [ ] **Step 3: Replace `Program.cs` with module-aware bootstrap**

```csharp
using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Modules.Common.Database;
using Dodostays.Api.Modules.Common.Health;
using Dodostays.Api.Modules.Common.ProblemDetails;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, lc) => lc
    .ReadFrom.Configuration(ctx.Configuration)
    .WriteTo.Console());

var connectionString = builder.Configuration.GetConnectionString("Postgres")
    ?? throw new InvalidOperationException("ConnectionStrings:Postgres is not set.");

builder.Services.AddDbContext<DodostaysDbContext>(opts =>
    opts.UseNpgsql(connectionString, npg => npg.UseNetTopologySuite()));

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

app.MapHealthCheckEndpoints();

app.Run();

namespace Dodostays.Api
{
    public partial class Program;
}
```

- [ ] **Step 4: Replace `appsettings.json`**

```json
{
  "ConnectionStrings": {
    "Postgres": ""
  },
  "Serilog": {
    "MinimumLevel": {
      "Default": "Information",
      "Override": {
        "Microsoft.AspNetCore": "Warning",
        "Microsoft.EntityFrameworkCore.Database.Command": "Warning"
      }
    }
  },
  "AllowedHosts": "*"
}
```

- [ ] **Step 5: Replace `appsettings.Development.json`**

```json
{
  "ConnectionStrings": {
    "Postgres": "Host=localhost;Port=5432;Database=dodostays;Username=dodostays;Password=dev_only_change_me"
  },
  "Serilog": {
    "MinimumLevel": {
      "Default": "Debug",
      "Override": {
        "Microsoft.AspNetCore": "Information"
      }
    }
  }
}
```

- [ ] **Step 6: Replace `Properties/launchSettings.json`**

```json
{
  "$schema": "https://json.schemastore.org/launchsettings.json",
  "profiles": {
    "Dodostays.Api": {
      "commandName": "Project",
      "dotnetRunMessages": true,
      "launchBrowser": true,
      "launchUrl": "swagger",
      "applicationUrl": "http://localhost:5080",
      "environmentVariables": {
        "ASPNETCORE_ENVIRONMENT": "Development"
      }
    }
  }
}
```

- [ ] **Step 7: Commit**

```bash
git add api/
git commit -m "feat(api): scaffold ASP.NET Core 9 project with EF, Serilog, Swagger"
```

---

## Task 0.6: Add the DbContext, ProblemDetails, and Health endpoints

**Files:**
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Common/Database/DodostaysDbContext.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Common/Database/DesignTimeDbContextFactory.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Common/Health/HealthCheckEndpoints.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Common/ProblemDetails/ProblemDetailsExtensions.cs`

- [ ] **Step 1: Write `DodostaysDbContext.cs`**

```csharp
using Microsoft.EntityFrameworkCore;

namespace Dodostays.Api.Modules.Common.Database;

public partial class DodostaysDbContext : DbContext
{
    public DodostaysDbContext(DbContextOptions<DodostaysDbContext> options) : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasPostgresExtension("postgis");
        base.OnModelCreating(modelBuilder);
    }
}
```

> **Note for future plans:** each module adds its tables via a `partial class DodostaysDbContext` file in its own folder, e.g. `Modules/Identity/Database/DodostaysDbContext.Identity.cs` defining `public DbSet<User> Users => Set<User>();` and overriding `OnModelCreating` via a separate method.

- [ ] **Step 2: Write `DesignTimeDbContextFactory.cs`**

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace Dodostays.Api.Modules.Common.Database;

public sealed class DesignTimeDbContextFactory : IDesignTimeDbContextFactory<DodostaysDbContext>
{
    public DodostaysDbContext CreateDbContext(string[] args)
    {
        var configuration = new ConfigurationBuilder()
            .AddJsonFile("appsettings.json", optional: false)
            .AddJsonFile("appsettings.Development.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connectionString = configuration.GetConnectionString("Postgres")
            ?? throw new InvalidOperationException("ConnectionStrings:Postgres is not set.");

        var options = new DbContextOptionsBuilder<DodostaysDbContext>()
            .UseNpgsql(connectionString, npg => npg.UseNetTopologySuite())
            .Options;

        return new DodostaysDbContext(options);
    }
}
```

- [ ] **Step 3: Write `HealthCheckEndpoints.cs`**

```csharp
using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Modules.Common.Database;

namespace Dodostays.Api.Modules.Common.Health;

public static class HealthCheckEndpoints
{
    public static IEndpointRouteBuilder MapHealthCheckEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/health/live", () => Results.Ok(new { status = "live" }));

        app.MapGet("/health/ready", async (DodostaysDbContext db, CancellationToken ct) =>
        {
            var canConnect = await db.Database.CanConnectAsync(ct);
            return canConnect
                ? Results.Ok(new { status = "ready", database = "ok" })
                : Results.Json(new { status = "not_ready", database = "unreachable" },
                    statusCode: StatusCodes.Status503ServiceUnavailable);
        });

        return app;
    }
}
```

- [ ] **Step 4: Write `ProblemDetailsExtensions.cs`**

```csharp
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
```

- [ ] **Step 5: Run the API and verify health endpoints**

```bash
cd C:/temp/Dodostays/api
dotnet run --project src/Dodostays.Api
```

In another terminal:
```bash
curl http://localhost:5080/health/live
curl http://localhost:5080/health/ready
```

Expected:
- `/health/live` returns `{"status":"live"}` HTTP 200
- `/health/ready` returns `{"status":"ready","database":"ok"}` HTTP 200 (Postgres must be running)

Stop the API with Ctrl+C.

- [ ] **Step 6: Commit**

```bash
git add api/
git commit -m "feat(api): add DbContext, problem-details, and health endpoints"
```

---

## Task 0.7: Add an initial EF Core migration

**Files:**
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Common/Database/Migrations/<timestamp>_InitialPostgis.cs` (auto-generated)

- [ ] **Step 1: Install `dotnet-ef` if missing**

Run: `dotnet tool install --global dotnet-ef --version 9.0.0`

Skip if it's already installed (`dotnet-ef --version`).

- [ ] **Step 2: Create initial migration**

```bash
cd C:/temp/Dodostays/api
dotnet ef migrations add InitialPostgis --project src/Dodostays.Api --output-dir Modules/Common/Database/Migrations
```

Expected: a new migration file is created under `Modules/Common/Database/Migrations/`.

- [ ] **Step 3: Apply the migration**

```bash
dotnet ef database update --project src/Dodostays.Api
```

Expected: PostGIS extension installed in the dodostays database (no other tables yet — those come in later plans).

- [ ] **Step 4: Verify in Postgres**

```bash
docker exec -it dodostays-postgres psql -U dodostays -d dodostays -c "\dx"
```

Expected: `postgis` extension listed.

- [ ] **Step 5: Commit**

```bash
git add api/
git commit -m "feat(api): add initial EF migration enabling PostGIS"
```

---

## Task 0.8: Add unit and integration test projects

**Files:**
- Create: `C:/temp/Dodostays/api/tests/Dodostays.Api.Tests/Dodostays.Api.Tests.csproj`
- Create: `C:/temp/Dodostays/api/tests/Dodostays.Api.Tests/HealthLiveTests.cs`
- Create: `C:/temp/Dodostays/api/tests/Dodostays.Api.IntegrationTests/Dodostays.Api.IntegrationTests.csproj`
- Create: `C:/temp/Dodostays/api/tests/Dodostays.Api.IntegrationTests/PostgresFixture.cs`
- Create: `C:/temp/Dodostays/api/tests/Dodostays.Api.IntegrationTests/HealthReadyTests.cs`

- [ ] **Step 1: Create unit test project**

```bash
cd C:/temp/Dodostays/api
dotnet new xunit -n Dodostays.Api.Tests -o tests/Dodostays.Api.Tests --framework net9.0
dotnet sln add tests/Dodostays.Api.Tests/Dodostays.Api.Tests.csproj
dotnet add tests/Dodostays.Api.Tests/Dodostays.Api.Tests.csproj reference src/Dodostays.Api/Dodostays.Api.csproj
rm tests/Dodostays.Api.Tests/UnitTest1.cs
```

- [ ] **Step 2: Replace `Dodostays.Api.Tests.csproj`**

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <IsPackable>false</IsPackable>
    <RootNamespace>Dodostays.Api.Tests</RootNamespace>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" />
    <PackageReference Include="xunit" />
    <PackageReference Include="xunit.runner.visualstudio" />
    <PackageReference Include="FluentAssertions" />
    <PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\..\src\Dodostays.Api\Dodostays.Api.csproj" />
  </ItemGroup>
</Project>
```

- [ ] **Step 3: Write a smoke test for the live endpoint (no DB required)**

`api/tests/Dodostays.Api.Tests/HealthLiveTests.cs`:

```csharp
using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Modules.Common.Database;

namespace Dodostays.Api.Tests;

public class HealthLiveTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public HealthLiveTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                var descriptor = services.Single(s => s.ServiceType == typeof(DbContextOptions<DodostaysDbContext>));
                services.Remove(descriptor);
                services.AddDbContext<DodostaysDbContext>(opts => opts.UseInMemoryDatabase("hl-test"));
            });
        });
    }

    [Fact]
    public async Task Live_returns_ok()
    {
        var client = _factory.CreateClient();
        var response = await client.GetAsync("/health/live");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
```

> **Note:** `WebApplicationFactory<Program>` requires the `Program` class be public (we did that in Task 0.5 with `public partial class Program;`). The in-memory DB swap is only for the live test — the ready test uses a real Postgres in the integration project.

- [ ] **Step 4: Add EF in-memory provider to test project**

```bash
dotnet add tests/Dodostays.Api.Tests/Dodostays.Api.Tests.csproj package Microsoft.EntityFrameworkCore.InMemory --version 9.0.0
```

Add to `Directory.Packages.props`:

```xml
<PackageVersion Include="Microsoft.EntityFrameworkCore.InMemory" Version="9.0.0" />
```

- [ ] **Step 5: Run unit tests**

Run: `dotnet test api/tests/Dodostays.Api.Tests/Dodostays.Api.Tests.csproj`

Expected: 1 passing test.

- [ ] **Step 6: Create integration test project**

```bash
cd C:/temp/Dodostays/api
dotnet new xunit -n Dodostays.Api.IntegrationTests -o tests/Dodostays.Api.IntegrationTests --framework net9.0
dotnet sln add tests/Dodostays.Api.IntegrationTests/Dodostays.Api.IntegrationTests.csproj
dotnet add tests/Dodostays.Api.IntegrationTests/Dodostays.Api.IntegrationTests.csproj reference src/Dodostays.Api/Dodostays.Api.csproj
rm tests/Dodostays.Api.IntegrationTests/UnitTest1.cs
```

- [ ] **Step 7: Replace `Dodostays.Api.IntegrationTests.csproj`**

```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <IsPackable>false</IsPackable>
    <RootNamespace>Dodostays.Api.IntegrationTests</RootNamespace>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="Microsoft.NET.Test.Sdk" />
    <PackageReference Include="xunit" />
    <PackageReference Include="xunit.runner.visualstudio" />
    <PackageReference Include="FluentAssertions" />
    <PackageReference Include="Microsoft.AspNetCore.Mvc.Testing" />
    <PackageReference Include="Testcontainers.PostgreSql" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\..\src\Dodostays.Api\Dodostays.Api.csproj" />
  </ItemGroup>
</Project>
```

- [ ] **Step 8: Write `PostgresFixture.cs`**

```csharp
using Microsoft.EntityFrameworkCore;
using Testcontainers.PostgreSql;
using Dodostays.Api.Modules.Common.Database;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;

namespace Dodostays.Api.IntegrationTests;

public sealed class PostgresFixture : IAsyncLifetime
{
    private readonly PostgreSqlContainer _container = new PostgreSqlBuilder()
        .WithImage("postgis/postgis:16-3.4")
        .WithDatabase("dodostays_test")
        .WithUsername("dodostays_test")
        .WithPassword("dodostays_test")
        .Build();

    public string ConnectionString => _container.GetConnectionString();

    public WebApplicationFactory<Program> CreateFactory() =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseSetting("ConnectionStrings:Postgres", ConnectionString);
        });

    public async Task InitializeAsync()
    {
        await _container.StartAsync();

        var options = new DbContextOptionsBuilder<DodostaysDbContext>()
            .UseNpgsql(ConnectionString, npg => npg.UseNetTopologySuite())
            .Options;
        await using var db = new DodostaysDbContext(options);
        await db.Database.MigrateAsync();
    }

    public async Task DisposeAsync() => await _container.DisposeAsync();
}
```

- [ ] **Step 9: Write `HealthReadyTests.cs`**

```csharp
using System.Net;
using FluentAssertions;

namespace Dodostays.Api.IntegrationTests;

public class HealthReadyTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fx;

    public HealthReadyTests(PostgresFixture fx) => _fx = fx;

    [Fact]
    public async Task Ready_returns_ok_when_database_reachable()
    {
        using var factory = _fx.CreateFactory();
        var client = factory.CreateClient();

        var response = await client.GetAsync("/health/ready");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
```

- [ ] **Step 10: Run integration tests (Docker must be running)**

Run: `dotnet test api/tests/Dodostays.Api.IntegrationTests/Dodostays.Api.IntegrationTests.csproj`

Expected: 1 passing test (Testcontainers spins up an isolated Postgres+PostGIS).

- [ ] **Step 11: Commit**

```bash
git add api/
git commit -m "test(api): add unit and integration test projects with Testcontainers"
```

---

## Task 0.9: Bootstrap the Next.js frontend

**Files:**
- Create: `C:/temp/Dodostays/web/package.json`
- Create: `C:/temp/Dodostays/web/tsconfig.json`
- Create: `C:/temp/Dodostays/web/next.config.ts`
- Create: `C:/temp/Dodostays/web/tailwind.config.ts`
- Create: `C:/temp/Dodostays/web/postcss.config.js`
- Create: `C:/temp/Dodostays/web/.eslintrc.json`
- Create: `C:/temp/Dodostays/web/playwright.config.ts`
- Create: `C:/temp/Dodostays/web/src/app/layout.tsx`
- Create: `C:/temp/Dodostays/web/src/app/page.tsx`
- Create: `C:/temp/Dodostays/web/src/app/globals.css`
- Create: `C:/temp/Dodostays/web/src/app/api/health/route.ts`
- Create: `C:/temp/Dodostays/web/src/lib/api-client.ts`
- Create: `C:/temp/Dodostays/web/src/i18n/en.json`
- Create: `C:/temp/Dodostays/web/src/i18n/fr.json`
- Create: `C:/temp/Dodostays/web/e2e/smoke.spec.ts`

- [ ] **Step 1: Initialize Next.js app**

```bash
cd C:/temp/Dodostays
npx --yes create-next-app@latest web --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbo
```

Accept defaults for any prompt. The `web/` folder is now bootstrapped.

- [ ] **Step 2: Pin Node version & add scripts**

Replace `web/package.json`'s `"scripts"` section:

```json
"scripts": {
  "dev": "next dev -p 3000",
  "build": "next build",
  "start": "next start -p 3000",
  "lint": "next lint",
  "typecheck": "tsc --noEmit",
  "test:e2e": "playwright test"
}
```

Add at the top of `web/package.json`:

```json
"engines": {
  "node": ">=20.11.1"
},
```

- [ ] **Step 3: Replace `web/src/app/page.tsx` with a placeholder**

```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold">DodoStays</h1>
        <p className="mt-2 text-gray-600">Mauritius. Real prices. Instant book.</p>
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Create `web/src/app/api/health/route.ts`**

```ts
import { NextResponse } from "next/server";

export async function GET() {
  const apiBase = process.env.API_BASE_URL ?? "http://localhost:5080";
  try {
    const res = await fetch(`${apiBase}/health/ready`, { cache: "no-store" });
    const body = await res.json();
    return NextResponse.json({ web: "ok", api: body }, { status: res.ok ? 200 : 503 });
  } catch (err) {
    return NextResponse.json(
      { web: "ok", api: "unreachable", error: (err as Error).message },
      { status: 503 }
    );
  }
}
```

- [ ] **Step 5: Create `web/src/lib/api-client.ts`**

```ts
const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5080";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}
```

- [ ] **Step 6: Create i18n stubs**

`web/src/i18n/en.json`:

```json
{ "home": { "tagline": "Mauritius. Real prices. Instant book." } }
```

`web/src/i18n/fr.json`:

```json
{ "home": { "tagline": "Maurice. Prix réels. Réservation instantanée." } }
```

- [ ] **Step 7: Install Playwright**

```bash
cd C:/temp/Dodostays/web
npm install -D @playwright/test@^1.48.0
npx playwright install chromium
```

- [ ] **Step 8: Create `web/playwright.config.ts`**

```ts
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  use: { baseURL: "http://localhost:3000" },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

- [ ] **Step 9: Create `web/e2e/smoke.spec.ts`**

```ts
import { test, expect } from "@playwright/test";

test("homepage renders DodoStays brand", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "DodoStays" })).toBeVisible();
});
```

- [ ] **Step 10: Run frontend smoke test**

```bash
cd C:/temp/Dodostays/web
npm run typecheck
npm run lint
npm run test:e2e
```

Expected: typecheck clean, lint clean, 1 Playwright test passes.

- [ ] **Step 11: Commit**

```bash
git add web/
git commit -m "feat(web): scaffold Next.js 15 frontend with Playwright smoke test"
```

---

## Task 0.10: Backend Dockerfile

**Files:**
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Dockerfile`
- Create: `C:/temp/Dodostays/api/.dockerignore`

- [ ] **Step 1: Create `api/.dockerignore`**

```
**/bin
**/obj
**/.vs
**/node_modules
**/*.user
**/Dockerfile
.git
```

- [ ] **Step 2: Create `api/src/Dodostays.Api/Dockerfile`**

```dockerfile
# syntax=docker/dockerfile:1.7

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY Directory.Build.props Directory.Packages.props Dodostays.sln ./
COPY src/Dodostays.Api.Contracts/ src/Dodostays.Api.Contracts/
COPY src/Dodostays.Api/ src/Dodostays.Api/
RUN dotnet restore src/Dodostays.Api/Dodostays.Api.csproj
RUN dotnet publish src/Dodostays.Api/Dodostays.Api.csproj -c Release -o /app/publish --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "Dodostays.Api.dll"]
```

- [ ] **Step 3: Build the image**

```bash
cd C:/temp/Dodostays/api
docker build -f src/Dodostays.Api/Dockerfile -t dodostays-api:dev .
```

Expected: image builds successfully (~200MB).

- [ ] **Step 4: Run it against local Postgres**

```bash
docker run --rm -p 8080:8080 \
  -e ConnectionStrings__Postgres="Host=host.docker.internal;Port=5432;Database=dodostays;Username=dodostays;Password=dev_only_change_me" \
  dodostays-api:dev
```

In another terminal:
```bash
curl http://localhost:8080/health/ready
```

Expected: `{"status":"ready","database":"ok"}`.

Stop the container with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add api/
git commit -m "build(api): add Dockerfile for backend"
```

---

## Task 0.11: Frontend Dockerfile

**Files:**
- Create: `C:/temp/Dodostays/web/Dockerfile`
- Create: `C:/temp/Dodostays/web/.dockerignore`

- [ ] **Step 1: Create `web/.dockerignore`**

```
node_modules
.next
out
.env*.local
playwright-report
test-results
```

- [ ] **Step 2: Update `web/next.config.ts` to enable standalone output**

Replace `web/next.config.ts`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
};

export default nextConfig;
```

- [ ] **Step 3: Create `web/Dockerfile`**

```dockerfile
# syntax=docker/dockerfile:1.7

FROM node:20.11.1-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:20.11.1-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20.11.1-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

- [ ] **Step 4: Build & run**

```bash
cd C:/temp/Dodostays/web
docker build -t dodostays-web:dev .
docker run --rm -p 3000:3000 dodostays-web:dev
```

Visit http://localhost:3000 → should show the DodoStays placeholder homepage.

Stop the container with Ctrl+C.

- [ ] **Step 5: Commit**

```bash
git add web/
git commit -m "build(web): add Dockerfile for frontend with standalone output"
```

---

## Task 0.12: Production docker-compose

**Files:**
- Create: `C:/temp/Dodostays/infra/docker-compose.prod.yml`
- Create: `C:/temp/Dodostays/infra/deploy.sh`

- [ ] **Step 1: Create `infra/docker-compose.prod.yml`**

```yaml
services:
  api:
    image: ghcr.io/dante089172/dodostays-api:${IMAGE_TAG}
    restart: unless-stopped
    environment:
      ASPNETCORE_ENVIRONMENT: Production
      ConnectionStrings__Postgres: ${POSTGRES_CONN}
    ports:
      - "127.0.0.1:8080:8080"
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:8080/health/live || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 5

  web:
    image: ghcr.io/dante089172/dodostays-web:${IMAGE_TAG}
    restart: unless-stopped
    environment:
      API_BASE_URL: http://api:8080
      NEXT_PUBLIC_API_BASE_URL: ${PUBLIC_API_BASE_URL}
    ports:
      - "127.0.0.1:3000:3000"
    depends_on:
      api:
        condition: service_healthy
```

> **Notes:**
> - Postgres in production is **Hetzner managed Postgres**, not in this compose file. The connection string is provided via `POSTGRES_CONN`.
> - The reverse proxy (Caddy with automatic HTTPS) is set up manually on the Hetzner host in Task 0.14 — outside docker-compose for simplicity.

- [ ] **Step 2: Create `infra/deploy.sh`**

```bash
#!/usr/bin/env bash
set -euo pipefail

: "${HETZNER_HOST:?must be set}"
: "${IMAGE_TAG:?must be set}"
: "${POSTGRES_CONN:?must be set}"
: "${PUBLIC_API_BASE_URL:?must be set}"

echo "Deploying tag $IMAGE_TAG to $HETZNER_HOST"

scp infra/docker-compose.prod.yml "deploy@${HETZNER_HOST}:/opt/dodostays/docker-compose.yml"

ssh "deploy@${HETZNER_HOST}" bash -s <<EOF
set -euo pipefail
cd /opt/dodostays
export IMAGE_TAG="$IMAGE_TAG"
export POSTGRES_CONN='$POSTGRES_CONN'
export PUBLIC_API_BASE_URL='$PUBLIC_API_BASE_URL'
docker login ghcr.io -u "${GHCR_USER:-x}" -p "${GHCR_TOKEN:-x}"
docker compose pull
docker compose up -d
docker compose ps
EOF

echo "Deploy complete."
```

- [ ] **Step 3: Make executable & commit**

```bash
chmod +x infra/deploy.sh
git add infra/
git commit -m "build(infra): production docker-compose and deploy script"
```

---

## Task 0.13: GitHub Actions CI

**Files:**
- Create: `C:/temp/Dodostays/.github/workflows/ci-backend.yml`
- Create: `C:/temp/Dodostays/.github/workflows/ci-frontend.yml`
- Create: `C:/temp/Dodostays/.github/workflows/deploy.yml`

- [ ] **Step 1: Create `ci-backend.yml`**

```yaml
name: ci-backend

on:
  push:
    branches: [master]
    paths:
      - 'api/**'
      - '.github/workflows/ci-backend.yml'
  pull_request:
    paths:
      - 'api/**'

jobs:
  build-and-test:
    runs-on: ubuntu-24.04
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: '9.0.x'
      - name: Restore
        working-directory: api
        run: dotnet restore
      - name: Build
        working-directory: api
        run: dotnet build --no-restore -c Release
      - name: Unit tests
        working-directory: api
        run: dotnet test tests/Dodostays.Api.Tests/Dodostays.Api.Tests.csproj --no-build -c Release --logger "console;verbosity=normal"
      - name: Integration tests
        working-directory: api
        run: dotnet test tests/Dodostays.Api.IntegrationTests/Dodostays.Api.IntegrationTests.csproj --no-build -c Release --logger "console;verbosity=normal"
```

- [ ] **Step 2: Create `ci-frontend.yml`**

```yaml
name: ci-frontend

on:
  push:
    branches: [master]
    paths:
      - 'web/**'
      - '.github/workflows/ci-frontend.yml'
  pull_request:
    paths:
      - 'web/**'

jobs:
  build-and-test:
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    defaults:
      run:
        working-directory: web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20.11.1'
          cache: 'npm'
          cache-dependency-path: web/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run build
      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
```

- [ ] **Step 3: Create `deploy.yml`**

```yaml
name: deploy

on:
  push:
    branches: [master]
    paths:
      - 'api/**'
      - 'web/**'
      - 'infra/**'
      - '.github/workflows/deploy.yml'
  workflow_dispatch:

jobs:
  build-and-push:
    runs-on: ubuntu-24.04
    permissions:
      contents: read
      packages: write
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Compute image tag
        id: tag
        run: echo "tag=$(echo ${{ github.sha }} | cut -c1-12)" >> "$GITHUB_OUTPUT"
      - name: Build & push API
        uses: docker/build-push-action@v6
        with:
          context: ./api
          file: ./api/src/Dodostays.Api/Dockerfile
          push: true
          tags: ghcr.io/dante089172/dodostays-api:${{ steps.tag.outputs.tag }}
      - name: Build & push Web
        uses: docker/build-push-action@v6
        with:
          context: ./web
          push: true
          tags: ghcr.io/dante089172/dodostays-web:${{ steps.tag.outputs.tag }}
    outputs:
      tag: ${{ steps.tag.outputs.tag }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - name: Setup SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.HETZNER_SSH_KEY }}" > ~/.ssh/id_ed25519
          chmod 600 ~/.ssh/id_ed25519
          ssh-keyscan -H ${{ secrets.HETZNER_HOST }} >> ~/.ssh/known_hosts
      - name: Deploy
        env:
          HETZNER_HOST: ${{ secrets.HETZNER_HOST }}
          IMAGE_TAG: ${{ needs.build-and-push.outputs.tag }}
          POSTGRES_CONN: ${{ secrets.POSTGRES_CONN }}
          PUBLIC_API_BASE_URL: ${{ secrets.PUBLIC_API_BASE_URL }}
          GHCR_USER: ${{ github.actor }}
          GHCR_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: bash infra/deploy.sh
```

> **Note on secrets:** before this workflow can run successfully, set these GitHub repo secrets manually: `HETZNER_HOST`, `HETZNER_SSH_KEY`, `POSTGRES_CONN`, `PUBLIC_API_BASE_URL`. The deploy job will fail loudly if missing — that's the desired behavior.

- [ ] **Step 4: Commit**

```bash
git add .github/
git commit -m "ci: add backend, frontend, and deploy workflows"
```

---

## Task 0.14: Hetzner host bootstrap (one-time, manual)

> **Note:** This task is performed by the human operator on a freshly provisioned Hetzner Cloud CX42 server (Ubuntu 24.04). Document the steps; the agent should NOT attempt to SSH into a real server. After this task, future deploys are automated via Task 0.13's `deploy.yml`.

- [ ] **Step 1: Provision Hetzner Cloud CX42 (manual, via Hetzner console)**
  - Image: Ubuntu 24.04
  - Datacenter: Falkenstein (eu-central)
  - Add SSH public key to the server
  - Set hostname `dodostays-app-01`
  - Open firewall: 22, 80, 443

- [ ] **Step 2: Provision Hetzner managed Postgres**
  - Postgres 16
  - Same datacenter as the app server (private network)
  - Enable PostGIS extension via Hetzner UI
  - Note the connection string (use as `POSTGRES_CONN` secret)

- [ ] **Step 3: SSH in and install Docker + Caddy**

```bash
ssh root@<server-ip>
adduser deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh

curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy

apt-get install -y caddy
mkdir -p /opt/dodostays
chown deploy:deploy /opt/dodostays
```

- [ ] **Step 4: Configure Caddy reverse proxy**

`/etc/caddy/Caddyfile`:

```
api.dodostays.com {
  reverse_proxy 127.0.0.1:8080
}

dodostays.com, www.dodostays.com {
  reverse_proxy 127.0.0.1:3000
}
```

```bash
systemctl restart caddy
systemctl enable caddy
```

> Caddy will auto-issue Let's Encrypt certs once DNS A records point at the server.

- [ ] **Step 5: Configure DNS**

In your DNS provider, add A records:
- `dodostays.com` → server IP
- `www.dodostays.com` → server IP
- `api.dodostays.com` → server IP

- [ ] **Step 6: Set GitHub repo secrets**

Via GitHub web UI → repo → Settings → Secrets and variables → Actions:
- `HETZNER_HOST` = `<server IP or dodostays.com>`
- `HETZNER_SSH_KEY` = the **private** key paired with the public key on the server (deploy user)
- `POSTGRES_CONN` = `Host=<managed-pg-host>;Port=5432;Database=dodostays;Username=...;Password=...;SSL Mode=Require;Trust Server Certificate=true`
- `PUBLIC_API_BASE_URL` = `https://api.dodostays.com`

- [ ] **Step 7: Trigger deploy workflow**

```bash
gh workflow run deploy.yml
```

Expected: workflow succeeds; visiting https://dodostays.com shows the placeholder homepage; https://api.dodostays.com/health/ready returns ready.

- [ ] **Step 8: Document on the README**

Append to `README.md`:

```markdown
## Deployment

- Production: https://dodostays.com (web), https://api.dodostays.com (api)
- Hosting: Hetzner Cloud CX42 (Falkenstein) + Hetzner managed Postgres + Caddy reverse proxy
- CI/CD: GitHub Actions on push to `master`
```

Commit:
```bash
git add README.md
git commit -m "docs: document production deployment"
```

---

## Task 0.15: Push to GitHub

- [ ] **Step 1: Push master**

```bash
cd C:/temp/Dodostays
git push -u origin master
```

Expected: all commits pushed to `https://github.com/DANTE089172/DodoStays`. Both CI workflows run and pass on the first push.

- [ ] **Step 2: Verify CI green**

Run: `gh run list --limit 3`

Expected: 2 successful workflow runs (ci-backend, ci-frontend). The `deploy` workflow only runs once secrets are configured (Task 0.14).

---

## Definition of Done — Plan 00 Foundation

All boxes checked when:

- [ ] `https://github.com/DANTE089172/DodoStays` has the full repo at master
- [ ] `docker compose up -d` brings up Postgres+PostGIS locally
- [ ] `dotnet run --project api/src/Dodostays.Api` serves `/health/live` and `/health/ready` on port 5080
- [ ] `npm run dev` in `web/` serves the placeholder homepage on port 3000
- [ ] `dotnet test` passes for both Tests and IntegrationTests projects
- [ ] `npm run test:e2e` passes Playwright smoke test
- [ ] CI green for `ci-backend` and `ci-frontend` on master
- [ ] Production: `https://dodostays.com` + `https://api.dodostays.com/health/ready` live and reachable (after Task 0.14)
- [ ] `Dodostays.Api.Contracts` project exists and is the only project referenced across modules
- [ ] `DodostaysDbContext` is a `partial class` ready for module-specific DbSets

**This plan ships nothing the user can do — it's pure scaffolding. Plans 01-06 add the user-visible features.**
