# DodoStays Plan 01 — Identity & KYC

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add user authentication (email/password + Google OAuth), role-based authorization (`guest`, `host`, `admin`, `inspector`), KYC verification via an Onfido-shaped abstraction (real Onfido in prod; in-memory verifier for dev/test), and host onboarding fields (TAM license number, bank account placeholder, VAT number) — all behind clean module boundaries so subsequent plans can depend on `IUserContext`.

**Architecture:** Identity is a self-contained module under `api/src/Dodostays.Api/Modules/Identity/` — its own EF Core entities (extending ASP.NET Core Identity's `IdentityUser<Guid>` with DodoStays-specific fields), its own minimal API endpoints under `/api/identity/...`, its own DbContext partial that registers Identity tables alongside `__EFMigrationsHistory`. The Identity module exposes ONLY DTOs and `IUserContext` from `Dodostays.Api.Contracts` — no internal types leak. KYC uses a `IKycVerifier` interface with two implementations: `OnfidoKycVerifier` (real, plugged in via config) and `InMemoryKycVerifier` (default for dev — auto-approves). Frontend gets sign-up/sign-in pages, persistent session via httpOnly refresh-token cookie, and a `useUser()` React hook.

**Tech Stack:**
- Backend: ASP.NET Core Identity + EF Core, JWT bearer (15-min access tokens), refresh tokens stored hashed in DB, BCrypt password hashing (built-in to Identity)
- Google OAuth via `Microsoft.AspNetCore.Authentication.Google`
- KYC abstraction: `IKycVerifier` with Onfido HTTP adapter (real) and in-memory adapter (dev/test default)
- Validation: FluentValidation (already in stack)
- Frontend: React 19 server components for `/signin`, `/signup`, client component for forms, `next/navigation` for redirects, secure refresh-token cookie set by backend

**Pre-conditions (Plan 00 outputs we depend on):**
- `Dodostays.Api` with `Program.cs`, `DodostaysDbContext` (partial class) at `Modules/Common/Database/`
- Postgres+PostGIS running on localhost:5432
- `Dodostays.Api.Contracts` project with no DTOs yet
- Frontend app under `web/` with `apiFetch` helper at `src/lib/api-client.ts`

---

## File Structure

```
api/
└── src/
    ├── Dodostays.Api.Contracts/
    │   ├── Identity/
    │   │   ├── UserDto.cs              # public DTO returned to other modules / frontend
    │   │   ├── UserRole.cs             # enum: Guest, Host, Admin, Inspector
    │   │   ├── KycStatus.cs            # enum: Pending, Verified, Failed, ManualReview
    │   │   ├── IUserContext.cs         # interface: GetCurrentUserAsync, RequireUser
    │   │   ├── SignUpRequest.cs        # request DTO
    │   │   ├── SignInRequest.cs        # request DTO
    │   │   ├── AuthResponse.cs         # response DTO with access token + user
    │   │   └── HostProfileDto.cs       # TAM license #, VAT #, bank-acct masked
    │   └── Dodostays.Api.Contracts.csproj  (no change)
    │
    └── Dodostays.Api/
        └── Modules/
            └── Identity/
                ├── IdentityModule.cs         # extension methods: AddIdentityModule, MapIdentityEndpoints
                ├── Domain/
                │   ├── DodostaysUser.cs      # extends IdentityUser<Guid>
                │   ├── DodostaysRole.cs      # extends IdentityRole<Guid>
                │   ├── HostProfile.cs        # 1:1 with DodostaysUser if role=Host
                │   ├── RefreshToken.cs       # hashed token, expiry, revoked flag
                │   └── KycRecord.cs          # status, verifier id, evidence URL
                ├── Database/
                │   ├── DodostaysDbContext.Identity.cs   # partial: DbSets + OnModelCreatingIdentity
                │   ├── IdentityEntityConfigurations.cs   # IEntityTypeConfiguration<>s
                │   └── (Migrations land in Common/Database/Migrations/)
                ├── Auth/
                │   ├── JwtTokenIssuer.cs                # issues + validates JWTs
                │   ├── JwtAuthExtensions.cs             # AddJwtAuth (DI wiring)
                │   ├── RefreshTokenStore.cs             # rotate, revoke, validate
                │   └── PasswordHasherOptions.cs         # tune BCrypt rounds
                ├── Kyc/
                │   ├── IKycVerifier.cs                  # interface
                │   ├── InMemoryKycVerifier.cs           # dev: auto-approve after 200ms
                │   ├── OnfidoKycVerifier.cs             # prod: HTTP adapter (gated by config)
                │   └── KycOptions.cs                    # config binding
                ├── Endpoints/
                │   ├── SignUpEndpoint.cs                # POST /api/identity/signup
                │   ├── SignInEndpoint.cs                # POST /api/identity/signin
                │   ├── RefreshEndpoint.cs               # POST /api/identity/refresh
                │   ├── SignOutEndpoint.cs               # POST /api/identity/signout
                │   ├── MeEndpoint.cs                    # GET /api/identity/me
                │   ├── GoogleCallbackEndpoint.cs        # GET /api/identity/google/callback
                │   └── HostProfileEndpoints.cs          # PUT /api/identity/host-profile
                ├── Validation/
                │   ├── SignUpValidator.cs
                │   ├── SignInValidator.cs
                │   └── HostProfileValidator.cs
                └── Services/
                    ├── UserContext.cs                   # IUserContext implementation
                    └── HostOnboardingService.cs         # creates HostProfile + KycRecord

api/tests/
├── Dodostays.Api.Tests/                                # unit tests (in-memory + mocks)
│   ├── Identity/
│   │   ├── JwtTokenIssuerTests.cs
│   │   ├── InMemoryKycVerifierTests.cs
│   │   ├── SignUpValidatorTests.cs
│   │   └── HostProfileValidatorTests.cs
└── Dodostays.Api.IntegrationTests/                     # real Postgres via Testcontainers
    └── Identity/
        ├── SignUpFlowTests.cs                          # end-to-end signup → token
        ├── SignInFlowTests.cs
        ├── RefreshFlowTests.cs
        ├── MeEndpointTests.cs
        └── HostOnboardingFlowTests.cs

web/
└── src/
    ├── app/
    │   ├── signin/
    │   │   └── page.tsx                # signin form (client component)
    │   ├── signup/
    │   │   ├── page.tsx                # signup form
    │   │   └── role-picker.tsx         # client: guest vs host
    │   └── account/
    │       └── page.tsx                # /account — shows current user, signout button
    ├── lib/
    │   ├── auth.ts                     # signIn, signUp, signOut, refreshAccessToken
    │   ├── auth-context.tsx            # React Context for user state
    │   └── use-user.ts                 # useUser() hook
    └── middleware.ts                   # Next.js middleware: refresh access token on expiry
```

**File responsibilities:**

- `IdentityModule.cs` — single entry point; `Program.cs` calls `builder.AddIdentityModule()` and `app.MapIdentityEndpoints()`. Nothing else in `Program.cs` knows about Identity internals.
- `Modules/Identity/Domain/*` — entity classes only, zero behavior except domain methods that don't need DI (e.g. `RefreshToken.Revoke()`).
- `Modules/Identity/Database/DodostaysDbContext.Identity.cs` — partial of the shared DbContext; declares `DbSet<DodostaysUser>`, `DbSet<HostProfile>`, etc. Calls `IdentityEntityConfigurations.Apply(modelBuilder)` from `OnModelCreatingIdentity()` invoked by the master `OnModelCreating`.
- `Modules/Identity/Auth/*` — token issuance + validation. Pure logic, easy to unit test.
- `Modules/Identity/Kyc/*` — KYC abstraction. `InMemoryKycVerifier` is the default (configured if `Kyc:Provider == "InMemory"`). `OnfidoKycVerifier` only registered when `Kyc:Provider == "Onfido"`.
- `Modules/Identity/Endpoints/*` — one file per endpoint. Each endpoint reads request → validator → service → result. No business logic in endpoints.
- `Modules/Identity/Services/*` — orchestration; Domain + Database + Kyc collaborators wired here.
- `Dodostays.Api.Contracts/Identity/*` — public surface only. `IUserContext` is the cross-module integration seam; later plans inject it via DI.
- `web/src/lib/auth.ts` — frontend auth client. Wraps `apiFetch` with cookie-aware sign-in flow.
- `web/src/middleware.ts` — minimal: only intercepts `/account` and `/host/*` routes for auth guard, not for refresh (refresh handled client-side via React Context).

**Module boundary rule:** other modules (`Listings`, `Bookings`, etc. — future plans) must reference `IUserContext` from `Dodostays.Api.Contracts`. They MUST NOT reference `DodostaysUser`, `RefreshToken`, or any other Identity internal type.

---

## Task 1.1: Add public Identity contracts

**Files:**
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api.Contracts/Identity/UserRole.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api.Contracts/Identity/KycStatus.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api.Contracts/Identity/UserDto.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api.Contracts/Identity/HostProfileDto.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api.Contracts/Identity/SignUpRequest.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api.Contracts/Identity/SignInRequest.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api.Contracts/Identity/AuthResponse.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api.Contracts/Identity/IUserContext.cs`

- [ ] **Step 1: Create `UserRole.cs`**

```csharp
namespace Dodostays.Api.Contracts.Identity;

public enum UserRole
{
    Guest = 0,
    Host = 1,
    Admin = 2,
    Inspector = 3
}
```

- [ ] **Step 2: Create `KycStatus.cs`**

```csharp
namespace Dodostays.Api.Contracts.Identity;

public enum KycStatus
{
    NotStarted = 0,
    Pending = 1,
    Verified = 2,
    Failed = 3,
    ManualReview = 4
}
```

- [ ] **Step 3: Create `UserDto.cs`**

```csharp
namespace Dodostays.Api.Contracts.Identity;

public sealed record UserDto(
    Guid Id,
    string Email,
    string DisplayName,
    string PreferredLanguage,
    UserRole Role,
    KycStatus KycStatus,
    bool TwoFactorEnabled);
```

- [ ] **Step 4: Create `HostProfileDto.cs`**

```csharp
namespace Dodostays.Api.Contracts.Identity;

public sealed record HostProfileDto(
    Guid UserId,
    string LegalName,
    string TamLicenseNumber,
    string? VatNumber,
    string? BankAccountLast4,
    string? BankName);
```

- [ ] **Step 5: Create `SignUpRequest.cs`**

```csharp
namespace Dodostays.Api.Contracts.Identity;

public sealed record SignUpRequest(
    string Email,
    string Password,
    string DisplayName,
    string PreferredLanguage,
    UserRole IntendedRole);
```

- [ ] **Step 6: Create `SignInRequest.cs`**

```csharp
namespace Dodostays.Api.Contracts.Identity;

public sealed record SignInRequest(string Email, string Password);
```

- [ ] **Step 7: Create `AuthResponse.cs`**

```csharp
namespace Dodostays.Api.Contracts.Identity;

public sealed record AuthResponse(
    string AccessToken,
    DateTimeOffset AccessTokenExpiresAt,
    UserDto User);
```

- [ ] **Step 8: Create `IUserContext.cs`**

```csharp
namespace Dodostays.Api.Contracts.Identity;

public interface IUserContext
{
    Guid? CurrentUserId { get; }
    Task<UserDto?> GetCurrentUserAsync(CancellationToken ct = default);
    Task<UserDto> RequireUserAsync(CancellationToken ct = default);
}
```

- [ ] **Step 9: Build to verify**

Run: `cd C:/temp/Dodostays/api && dotnet build src/Dodostays.Api.Contracts/Dodostays.Api.Contracts.csproj`

Expected: 0 errors. (Records, enums, and the interface should compile cleanly.)

- [ ] **Step 10: Commit**

```bash
git -C C:/temp/Dodostays add api/src/Dodostays.Api.Contracts/
git -C C:/temp/Dodostays commit -m "feat(contracts): add Identity DTOs and IUserContext interface"
```

---

## Task 1.2: Add Identity domain entities

**Files:**
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Identity/Domain/DodostaysUser.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Identity/Domain/DodostaysRole.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Identity/Domain/HostProfile.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Identity/Domain/RefreshToken.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Identity/Domain/KycRecord.cs`

- [ ] **Step 1: Create `DodostaysUser.cs`**

```csharp
using Microsoft.AspNetCore.Identity;
using Dodostays.Api.Contracts.Identity;

namespace Dodostays.Api.Modules.Identity.Domain;

public class DodostaysUser : IdentityUser<Guid>
{
    public string DisplayName { get; set; } = string.Empty;
    public string PreferredLanguage { get; set; } = "en";
    public UserRole Role { get; set; } = UserRole.Guest;
    public KycStatus KycStatus { get; set; } = KycStatus.NotStarted;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public HostProfile? HostProfile { get; set; }
}
```

- [ ] **Step 2: Create `DodostaysRole.cs`**

```csharp
using Microsoft.AspNetCore.Identity;

namespace Dodostays.Api.Modules.Identity.Domain;

public class DodostaysRole : IdentityRole<Guid>
{
    public DodostaysRole() { }
    public DodostaysRole(string name) : base(name) { }
}
```

- [ ] **Step 3: Create `HostProfile.cs`**

```csharp
namespace Dodostays.Api.Modules.Identity.Domain;

public class HostProfile
{
    public Guid UserId { get; set; }
    public DodostaysUser User { get; set; } = null!;
    public string LegalName { get; set; } = string.Empty;
    public string TamLicenseNumber { get; set; } = string.Empty;
    public string? VatNumber { get; set; }
    public string? BankAccountLast4 { get; set; }
    public string? BankName { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
```

- [ ] **Step 4: Create `RefreshToken.cs`**

```csharp
namespace Dodostays.Api.Modules.Identity.Domain;

public class RefreshToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public DodostaysUser User { get; set; } = null!;
    public string TokenHash { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }
    public Guid? ReplacedByTokenId { get; set; }

    public bool IsActive => RevokedAt is null && DateTimeOffset.UtcNow < ExpiresAt;

    public void Revoke()
    {
        RevokedAt = DateTimeOffset.UtcNow;
    }
}
```

- [ ] **Step 5: Create `KycRecord.cs`**

```csharp
using Dodostays.Api.Contracts.Identity;

namespace Dodostays.Api.Modules.Identity.Domain;

public class KycRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public DodostaysUser User { get; set; } = null!;
    public KycStatus Status { get; set; } = KycStatus.NotStarted;
    public string VerifierId { get; set; } = string.Empty;
    public string? ExternalReference { get; set; }
    public string? EvidenceUrl { get; set; }
    public string? FailureReason { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
```

- [ ] **Step 6: Add ASP.NET Core Identity package reference**

Verify `Microsoft.AspNetCore.Identity.EntityFrameworkCore` is already listed in `C:/temp/Dodostays/api/Directory.Packages.props` (it is, from Task 0.3). The Api csproj already references it (Task 0.5). No change needed.

- [ ] **Step 7: Build**

Run: `cd C:/temp/Dodostays/api && dotnet build`

Expected: 0 errors. (Entity classes don't need a DbContext registration to compile.)

- [ ] **Step 8: Commit**

```bash
git -C C:/temp/Dodostays add api/src/Dodostays.Api/Modules/Identity/Domain/
git -C C:/temp/Dodostays commit -m "feat(identity): add domain entities (User, Role, HostProfile, RefreshToken, KycRecord)"
```

---

## Task 1.3: Wire Identity tables into DbContext

**Files:**
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Identity/Database/IdentityEntityConfigurations.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Identity/Database/DodostaysDbContext.Identity.cs`
- Modify: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Common/Database/DodostaysDbContext.cs` (change inheritance to `IdentityDbContext`)

- [ ] **Step 1: Create `IdentityEntityConfigurations.cs`**

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Dodostays.Api.Modules.Identity.Domain;

namespace Dodostays.Api.Modules.Identity.Database;

internal static class IdentityEntityConfigurations
{
    public static void Apply(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<DodostaysUser>(b =>
        {
            b.Property(u => u.DisplayName).IsRequired().HasMaxLength(120);
            b.Property(u => u.PreferredLanguage).IsRequired().HasMaxLength(8);
            b.Property(u => u.Role).HasConversion<int>();
            b.Property(u => u.KycStatus).HasConversion<int>();
            b.HasIndex(u => u.CreatedAt);
        });

        modelBuilder.Entity<HostProfile>(b =>
        {
            b.HasKey(h => h.UserId);
            b.Property(h => h.LegalName).IsRequired().HasMaxLength(200);
            b.Property(h => h.TamLicenseNumber).IsRequired().HasMaxLength(64);
            b.Property(h => h.VatNumber).HasMaxLength(64);
            b.Property(h => h.BankAccountLast4).HasMaxLength(4);
            b.Property(h => h.BankName).HasMaxLength(120);
            b.HasOne(h => h.User)
                .WithOne(u => u.HostProfile)
                .HasForeignKey<HostProfile>(h => h.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            b.HasIndex(h => h.TamLicenseNumber).IsUnique();
        });

        modelBuilder.Entity<RefreshToken>(b =>
        {
            b.HasKey(t => t.Id);
            b.Property(t => t.TokenHash).IsRequired().HasMaxLength(128);
            b.HasIndex(t => t.TokenHash).IsUnique();
            b.HasIndex(t => new { t.UserId, t.RevokedAt });
            b.HasOne(t => t.User)
                .WithMany()
                .HasForeignKey(t => t.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<KycRecord>(b =>
        {
            b.HasKey(k => k.Id);
            b.Property(k => k.Status).HasConversion<int>();
            b.Property(k => k.VerifierId).IsRequired().HasMaxLength(64);
            b.Property(k => k.ExternalReference).HasMaxLength(128);
            b.Property(k => k.EvidenceUrl).HasMaxLength(2048);
            b.Property(k => k.FailureReason).HasMaxLength(1024);
            b.HasOne(k => k.User)
                .WithMany()
                .HasForeignKey(k => k.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            b.HasIndex(k => k.UserId);
        });
    }
}
```

- [ ] **Step 2: Create `DodostaysDbContext.Identity.cs`**

```csharp
using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Modules.Identity.Domain;

namespace Dodostays.Api.Modules.Common.Database;

public partial class DodostaysDbContext
{
    public DbSet<HostProfile> HostProfiles => Set<HostProfile>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<KycRecord> KycRecords => Set<KycRecord>();

    private static void OnModelCreatingIdentity(ModelBuilder modelBuilder)
    {
        Modules.Identity.Database.IdentityEntityConfigurations.Apply(modelBuilder);
    }
}
```

- [ ] **Step 3: Modify `DodostaysDbContext.cs` to inherit from `IdentityDbContext` and call the partial**

Replace the entire content of `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Common/Database/DodostaysDbContext.cs` with:

```csharp
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Modules.Identity.Domain;

namespace Dodostays.Api.Modules.Common.Database;

public partial class DodostaysDbContext : IdentityDbContext<DodostaysUser, DodostaysRole, Guid>
{
    public DodostaysDbContext(DbContextOptions<DodostaysDbContext> options) : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasPostgresExtension("postgis");
        OnModelCreatingIdentity(modelBuilder);
    }
}
```

- [ ] **Step 4: Build**

Run: `cd C:/temp/Dodostays/api && dotnet build`

Expected: 0 errors.

- [ ] **Step 5: Commit (no migration yet — that's the next task)**

```bash
git -C C:/temp/Dodostays add api/src/Dodostays.Api/Modules/Common/Database/ api/src/Dodostays.Api/Modules/Identity/Database/
git -C C:/temp/Dodostays commit -m "feat(identity): wire entities into DodostaysDbContext via IdentityDbContext"
```

---

## Task 1.4: Generate and apply Identity EF migration

**Files:**
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Common/Database/Migrations/<timestamp>_AddIdentitySchema.cs` (auto-generated)

- [ ] **Step 1: Generate migration**

```bash
cd C:/temp/Dodostays/api
dotnet ef migrations add AddIdentitySchema --project src/Dodostays.Api --output-dir Modules/Common/Database/Migrations
```

Expected: a new migration file is generated. The `Up()` method should create:
- ASP.NET Identity tables: `AspNetUsers`, `AspNetRoles`, `AspNetUserRoles`, `AspNetUserClaims`, `AspNetRoleClaims`, `AspNetUserLogins`, `AspNetUserTokens`
- DodoStays-specific columns on `AspNetUsers`: `DisplayName`, `PreferredLanguage`, `Role`, `KycStatus`, `CreatedAt`
- New tables: `HostProfiles`, `RefreshTokens`, `KycRecords`
- Unique index on `HostProfiles.TamLicenseNumber`
- Unique index on `RefreshTokens.TokenHash`

Read the generated migration file and skim the `Up()` method to confirm these are present. If not, STOP and report.

- [ ] **Step 2: Apply migration**

```bash
dotnet ef database update --project src/Dodostays.Api
```

Expected: all tables created in the `dodostays` database.

- [ ] **Step 3: Verify in Postgres**

```bash
docker exec dodostays-postgres psql -U dodostays -d dodostays -c "\dt"
```

Expected: `AspNetUsers`, `AspNetRoles`, `AspNetUserRoles`, `AspNetUserClaims`, `AspNetRoleClaims`, `AspNetUserLogins`, `AspNetUserTokens`, `HostProfiles`, `RefreshTokens`, `KycRecords`, `__EFMigrationsHistory` all present.

- [ ] **Step 4: Commit**

```bash
git -C C:/temp/Dodostays add api/src/Dodostays.Api/Modules/Common/Database/Migrations/
git -C C:/temp/Dodostays commit -m "feat(identity): EF migration for Identity schema"
```

---

## Task 1.5: JWT issuance and validation

**Files:**
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Identity/Auth/JwtOptions.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Identity/Auth/JwtTokenIssuer.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Identity/Auth/JwtAuthExtensions.cs`
- Test: `C:/temp/Dodostays/api/tests/Dodostays.Api.Tests/Identity/JwtTokenIssuerTests.cs`

- [ ] **Step 1: Write the failing test**

Create `C:/temp/Dodostays/api/tests/Dodostays.Api.Tests/Identity/JwtTokenIssuerTests.cs`:

```csharp
using System.IdentityModel.Tokens.Jwt;
using FluentAssertions;
using Microsoft.Extensions.Options;
using Dodostays.Api.Modules.Identity.Auth;
using Dodostays.Api.Modules.Identity.Domain;
using Dodostays.Api.Contracts.Identity;

namespace Dodostays.Api.Tests.Identity;

public class JwtTokenIssuerTests
{
    private static JwtTokenIssuer CreateIssuer()
    {
        var options = Options.Create(new JwtOptions
        {
            Issuer = "dodostays-test",
            Audience = "dodostays-test",
            SigningKey = "test-signing-key-must-be-at-least-32-chars-long-please",
            AccessTokenLifetime = TimeSpan.FromMinutes(15),
            RefreshTokenLifetime = TimeSpan.FromDays(30)
        });
        return new JwtTokenIssuer(options);
    }

    [Fact]
    public void IssueAccessToken_includes_user_id_and_role_claims()
    {
        var issuer = CreateIssuer();
        var user = new DodostaysUser
        {
            Id = Guid.NewGuid(),
            Email = "x@y.com",
            DisplayName = "X",
            Role = UserRole.Host,
            PreferredLanguage = "fr"
        };

        var (token, expiresAt) = issuer.IssueAccessToken(user);

        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);
        jwt.Claims.Should().Contain(c => c.Type == "sub" && c.Value == user.Id.ToString());
        jwt.Claims.Should().Contain(c => c.Type == "role" && c.Value == "Host");
        jwt.Claims.Should().Contain(c => c.Type == "email" && c.Value == "x@y.com");
        expiresAt.Should().BeCloseTo(DateTimeOffset.UtcNow.AddMinutes(15), TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void IssueRefreshToken_returns_random_string_and_hash()
    {
        var issuer = CreateIssuer();

        var (raw1, hash1) = issuer.IssueRefreshToken();
        var (raw2, hash2) = issuer.IssueRefreshToken();

        raw1.Should().NotBe(raw2);
        hash1.Should().NotBe(hash2);
        issuer.HashRefreshToken(raw1).Should().Be(hash1);
        issuer.HashRefreshToken(raw2).Should().Be(hash2);
    }
}
```

- [ ] **Step 2: Run test — should fail**

Run: `cd C:/temp/Dodostays/api && dotnet test tests/Dodostays.Api.Tests/Dodostays.Api.Tests.csproj --filter "FullyQualifiedName~JwtTokenIssuerTests"`

Expected: build error (`JwtTokenIssuer`/`JwtOptions` not found).

- [ ] **Step 3: Create `JwtOptions.cs`**

```csharp
namespace Dodostays.Api.Modules.Identity.Auth;

public sealed class JwtOptions
{
    public string Issuer { get; set; } = "dodostays";
    public string Audience { get; set; } = "dodostays";
    public string SigningKey { get; set; } = string.Empty;
    public TimeSpan AccessTokenLifetime { get; set; } = TimeSpan.FromMinutes(15);
    public TimeSpan RefreshTokenLifetime { get; set; } = TimeSpan.FromDays(30);
}
```

- [ ] **Step 4: Create `JwtTokenIssuer.cs`**

```csharp
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using Dodostays.Api.Modules.Identity.Domain;

namespace Dodostays.Api.Modules.Identity.Auth;

public sealed class JwtTokenIssuer
{
    private readonly JwtOptions _options;

    public JwtTokenIssuer(IOptions<JwtOptions> options)
    {
        _options = options.Value;
        if (_options.SigningKey.Length < 32)
            throw new InvalidOperationException("Jwt:SigningKey must be at least 32 characters.");
    }

    public (string Token, DateTimeOffset ExpiresAt) IssueAccessToken(DodostaysUser user)
    {
        var expiresAt = DateTimeOffset.UtcNow.Add(_options.AccessTokenLifetime);
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new("sub", user.Id.ToString()),
            new("email", user.Email ?? string.Empty),
            new("role", user.Role.ToString()),
            new("kyc", user.KycStatus.ToString()),
            new("lang", user.PreferredLanguage)
        };

        var jwt = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            expires: expiresAt.UtcDateTime,
            signingCredentials: creds);

        var token = new JwtSecurityTokenHandler().WriteToken(jwt);
        return (token, expiresAt);
    }

    public (string Raw, string Hash) IssueRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        var raw = Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
        return (raw, HashRefreshToken(raw));
    }

    public string HashRefreshToken(string raw)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
        return Convert.ToHexString(bytes);
    }

    public TimeSpan RefreshTokenLifetime => _options.RefreshTokenLifetime;
}
```

- [ ] **Step 5: Create `JwtAuthExtensions.cs`**

```csharp
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
```

- [ ] **Step 6: Add `System.IdentityModel.Tokens.Jwt` to Directory.Packages.props**

The `Microsoft.AspNetCore.Authentication.JwtBearer` package transitively includes `System.IdentityModel.Tokens.Jwt`. No new package needed.

- [ ] **Step 7: Run tests — should pass**

Run: `cd C:/temp/Dodostays/api && dotnet test tests/Dodostays.Api.Tests/Dodostays.Api.Tests.csproj --filter "FullyQualifiedName~JwtTokenIssuerTests"`

Expected: 2 passing.

- [ ] **Step 8: Commit**

```bash
git -C C:/temp/Dodostays add api/src/Dodostays.Api/Modules/Identity/Auth/ api/tests/Dodostays.Api.Tests/Identity/
git -C C:/temp/Dodostays commit -m "feat(identity): JWT issuance + validation with unit tests"
```

---

## Task 1.6: KYC abstraction with in-memory verifier

**Files:**
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Identity/Kyc/KycOptions.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Identity/Kyc/IKycVerifier.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Identity/Kyc/InMemoryKycVerifier.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Identity/Kyc/OnfidoKycVerifier.cs`
- Test: `C:/temp/Dodostays/api/tests/Dodostays.Api.Tests/Identity/InMemoryKycVerifierTests.cs`

- [ ] **Step 1: Write the failing test**

Create `C:/temp/Dodostays/api/tests/Dodostays.Api.Tests/Identity/InMemoryKycVerifierTests.cs`:

```csharp
using FluentAssertions;
using Dodostays.Api.Modules.Identity.Kyc;
using Dodostays.Api.Contracts.Identity;

namespace Dodostays.Api.Tests.Identity;

public class InMemoryKycVerifierTests
{
    [Fact]
    public async Task StartAsync_returns_verified_for_normal_user()
    {
        var verifier = new InMemoryKycVerifier();

        var result = await verifier.StartAsync(
            userId: Guid.NewGuid(),
            email: "real@guest.com",
            displayName: "Real Guest",
            CancellationToken.None);

        result.Status.Should().Be(KycStatus.Verified);
        result.VerifierId.Should().Be("in-memory");
        result.ExternalReference.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task StartAsync_returns_failed_for_blocked_email()
    {
        var verifier = new InMemoryKycVerifier();

        var result = await verifier.StartAsync(
            userId: Guid.NewGuid(),
            email: "fail-kyc@test.dodostays.local",
            displayName: "Blocked User",
            CancellationToken.None);

        result.Status.Should().Be(KycStatus.Failed);
        result.FailureReason.Should().NotBeNullOrEmpty();
    }
}
```

- [ ] **Step 2: Run test — should fail (build errors)**

Run: `cd C:/temp/Dodostays/api && dotnet test tests/Dodostays.Api.Tests/Dodostays.Api.Tests.csproj --filter "FullyQualifiedName~InMemoryKycVerifierTests"`

Expected: build errors.

- [ ] **Step 3: Create `KycOptions.cs`**

```csharp
namespace Dodostays.Api.Modules.Identity.Kyc;

public sealed class KycOptions
{
    public string Provider { get; set; } = "InMemory";
    public string? OnfidoApiKey { get; set; }
    public string? OnfidoBaseUrl { get; set; }
    public string? OnfidoWebhookSecret { get; set; }
}
```

- [ ] **Step 4: Create `IKycVerifier.cs`**

```csharp
using Dodostays.Api.Contracts.Identity;

namespace Dodostays.Api.Modules.Identity.Kyc;

public interface IKycVerifier
{
    string VerifierId { get; }
    Task<KycVerificationResult> StartAsync(Guid userId, string email, string displayName, CancellationToken ct);
}

public sealed record KycVerificationResult(
    KycStatus Status,
    string VerifierId,
    string? ExternalReference,
    string? EvidenceUrl,
    string? FailureReason);
```

- [ ] **Step 5: Create `InMemoryKycVerifier.cs`**

```csharp
using Dodostays.Api.Contracts.Identity;

namespace Dodostays.Api.Modules.Identity.Kyc;

public sealed class InMemoryKycVerifier : IKycVerifier
{
    private const string BlockedEmailMarker = "fail-kyc@";

    public string VerifierId => "in-memory";

    public async Task<KycVerificationResult> StartAsync(Guid userId, string email, string displayName, CancellationToken ct)
    {
        await Task.Delay(50, ct);

        if (email.StartsWith(BlockedEmailMarker, StringComparison.OrdinalIgnoreCase))
        {
            return new KycVerificationResult(
                Status: KycStatus.Failed,
                VerifierId: VerifierId,
                ExternalReference: $"in-memory-{userId:N}",
                EvidenceUrl: null,
                FailureReason: "Blocked test email");
        }

        return new KycVerificationResult(
            Status: KycStatus.Verified,
            VerifierId: VerifierId,
            ExternalReference: $"in-memory-{userId:N}",
            EvidenceUrl: null,
            FailureReason: null);
    }
}
```

- [ ] **Step 6: Create `OnfidoKycVerifier.cs` (skeleton — real HTTP integration deferred to Plan 09 launch)**

```csharp
using Dodostays.Api.Contracts.Identity;
using Microsoft.Extensions.Options;

namespace Dodostays.Api.Modules.Identity.Kyc;

public sealed class OnfidoKycVerifier : IKycVerifier
{
    private readonly HttpClient _http;
    private readonly KycOptions _options;

    public OnfidoKycVerifier(HttpClient http, IOptions<KycOptions> options)
    {
        _http = http;
        _options = options.Value;
        if (string.IsNullOrWhiteSpace(_options.OnfidoApiKey))
            throw new InvalidOperationException("Kyc:OnfidoApiKey is required when provider is Onfido.");
        _http.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Token", $"token={_options.OnfidoApiKey}");
    }

    public string VerifierId => "onfido";

    public Task<KycVerificationResult> StartAsync(Guid userId, string email, string displayName, CancellationToken ct)
    {
        // Real Onfido SDK integration is deferred to launch readiness work.
        // For now, calling this throws — production config must use InMemory until then.
        throw new NotImplementedException("Onfido integration is wired but not yet implemented. Use Kyc:Provider=InMemory until launch readiness work completes.");
    }
}
```

- [ ] **Step 7: Run tests — should pass**

Run: `cd C:/temp/Dodostays/api && dotnet test tests/Dodostays.Api.Tests/Dodostays.Api.Tests.csproj --filter "FullyQualifiedName~InMemoryKycVerifierTests"`

Expected: 2 passing.

- [ ] **Step 8: Commit**

```bash
git -C C:/temp/Dodostays add api/src/Dodostays.Api/Modules/Identity/Kyc/ api/tests/Dodostays.Api.Tests/Identity/InMemoryKycVerifierTests.cs
git -C C:/temp/Dodostays commit -m "feat(identity): KYC abstraction with InMemory + Onfido (skeleton) verifiers"
```

---

## Task 1.7: UserContext implementation + Module wiring

**Files:**
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Identity/Services/UserContext.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Identity/IdentityModule.cs`
- Modify: `C:/temp/Dodostays/api/src/Dodostays.Api/Program.cs` (add module wiring)
- Modify: `C:/temp/Dodostays/api/src/Dodostays.Api/appsettings.Development.json` (add Jwt + Kyc config)

- [ ] **Step 1: Create `UserContext.cs`**

```csharp
using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Common.Database;
using Dodostays.Api.Modules.Identity.Domain;

namespace Dodostays.Api.Modules.Identity.Services;

internal sealed class UserContext : IUserContext
{
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly DodostaysDbContext _db;

    public UserContext(IHttpContextAccessor httpContextAccessor, DodostaysDbContext db)
    {
        _httpContextAccessor = httpContextAccessor;
        _db = db;
    }

    public Guid? CurrentUserId
    {
        get
        {
            var sub = _httpContextAccessor.HttpContext?.User.FindFirst("sub")?.Value
                ?? _httpContextAccessor.HttpContext?.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return Guid.TryParse(sub, out var id) ? id : null;
        }
    }

    public async Task<UserDto?> GetCurrentUserAsync(CancellationToken ct = default)
    {
        var id = CurrentUserId;
        if (id is null) return null;
        var user = await _db.Set<DodostaysUser>().AsNoTracking()
            .SingleOrDefaultAsync(u => u.Id == id.Value, ct);
        if (user is null) return null;
        return new UserDto(
            user.Id,
            user.Email ?? string.Empty,
            user.DisplayName,
            user.PreferredLanguage,
            user.Role,
            user.KycStatus,
            user.TwoFactorEnabled);
    }

    public async Task<UserDto> RequireUserAsync(CancellationToken ct = default)
    {
        var user = await GetCurrentUserAsync(ct);
        return user ?? throw new UnauthorizedAccessException("Authentication required.");
    }
}
```

- [ ] **Step 2: Create `IdentityModule.cs`**

```csharp
using Microsoft.AspNetCore.Identity;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Common.Database;
using Dodostays.Api.Modules.Identity.Auth;
using Dodostays.Api.Modules.Identity.Domain;
using Dodostays.Api.Modules.Identity.Kyc;
using Dodostays.Api.Modules.Identity.Services;

namespace Dodostays.Api.Modules.Identity;

public static class IdentityModule
{
    public static IServiceCollection AddIdentityModule(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddIdentityCore<DodostaysUser>(opts =>
            {
                opts.Password.RequireDigit = true;
                opts.Password.RequireLowercase = true;
                opts.Password.RequireUppercase = true;
                opts.Password.RequiredLength = 10;
                opts.User.RequireUniqueEmail = true;
            })
            .AddRoles<DodostaysRole>()
            .AddEntityFrameworkStores<DodostaysDbContext>()
            .AddDefaultTokenProviders();

        services.AddDodostaysJwtAuth(configuration);

        services.Configure<KycOptions>(configuration.GetSection("Kyc"));
        var kycProvider = configuration["Kyc:Provider"] ?? "InMemory";
        if (string.Equals(kycProvider, "Onfido", StringComparison.OrdinalIgnoreCase))
        {
            services.AddHttpClient<IKycVerifier, OnfidoKycVerifier>();
        }
        else
        {
            services.AddSingleton<IKycVerifier, InMemoryKycVerifier>();
        }

        services.AddHttpContextAccessor();
        services.AddScoped<IUserContext, UserContext>();

        return services;
    }

    public static IEndpointRouteBuilder MapIdentityEndpoints(this IEndpointRouteBuilder app)
    {
        // Endpoints registered in Tasks 1.8 and 1.10 — module wiring keeps a single mount point.
        return app;
    }
}
```

- [ ] **Step 3: Modify `Program.cs` to register the module**

Replace `C:/temp/Dodostays/api/src/Dodostays.Api/Program.cs` with:

```csharp
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
```

- [ ] **Step 4: Update `appsettings.Development.json`**

Replace with:

```json
{
  "ConnectionStrings": {
    "Postgres": "Host=localhost;Port=5432;Database=dodostays;Username=dodostays;Password=dev_only_change_me"
  },
  "Jwt": {
    "Issuer": "dodostays-dev",
    "Audience": "dodostays-dev",
    "SigningKey": "development-only-signing-key-change-me-please-its-32-chars",
    "AccessTokenLifetime": "00:15:00",
    "RefreshTokenLifetime": "30.00:00:00"
  },
  "Kyc": {
    "Provider": "InMemory"
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

- [ ] **Step 5: Update `appsettings.json` (production-shape config)**

Replace with:

```json
{
  "ConnectionStrings": {
    "Postgres": ""
  },
  "Jwt": {
    "Issuer": "dodostays",
    "Audience": "dodostays",
    "SigningKey": "",
    "AccessTokenLifetime": "00:15:00",
    "RefreshTokenLifetime": "30.00:00:00"
  },
  "Kyc": {
    "Provider": "InMemory"
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

- [ ] **Step 6: Build and run smoke check**

```bash
cd C:/temp/Dodostays/api
dotnet build
```

Expected: 0 errors.

```bash
dotnet run --project src/Dodostays.Api
```

In another terminal:
```bash
curl -s http://localhost:5080/health/ready
```

Expected: `{"status":"ready","database":"ok"}` (Identity module registration must not have broken health checks).

Stop the API.

- [ ] **Step 7: Commit**

```bash
git -C C:/temp/Dodostays add api/
git -C C:/temp/Dodostays commit -m "feat(identity): wire IdentityModule into Program.cs with JWT and KYC config"
```

---

## Task 1.8: Sign-up endpoint and validation

**Files:**
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Identity/Validation/SignUpValidator.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Identity/Endpoints/SignUpEndpoint.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Identity/Auth/RefreshTokenStore.cs`
- Modify: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Identity/IdentityModule.cs` (register validator + map endpoint)
- Test: `C:/temp/Dodostays/api/tests/Dodostays.Api.Tests/Identity/SignUpValidatorTests.cs`
- Test: `C:/temp/Dodostays/api/tests/Dodostays.Api.IntegrationTests/Identity/SignUpFlowTests.cs`

- [ ] **Step 1: Write `SignUpValidatorTests.cs`**

```csharp
using FluentAssertions;
using FluentValidation.TestHelper;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Identity.Validation;

namespace Dodostays.Api.Tests.Identity;

public class SignUpValidatorTests
{
    private readonly SignUpValidator _validator = new();

    [Theory]
    [InlineData("", "Aa1!aaaaaa", "Test", "en", false)]
    [InlineData("not-email", "Aa1!aaaaaa", "Test", "en", false)]
    [InlineData("ok@x.com", "short", "Test", "en", false)]
    [InlineData("ok@x.com", "Aa1!aaaaaa", "", "en", false)]
    [InlineData("ok@x.com", "Aa1!aaaaaa", "Test", "xx", false)]
    [InlineData("ok@x.com", "Aa1!aaaaaa", "Test", "en", true)]
    [InlineData("ok@x.com", "Aa1!aaaaaa", "Test", "fr", true)]
    [InlineData("ok@x.com", "Aa1!aaaaaa", "Test", "mfe", true)]
    public void Validates_request_correctly(string email, string password, string display, string lang, bool expected)
    {
        var req = new SignUpRequest(email, password, display, lang, UserRole.Guest);
        var result = _validator.TestValidate(req);
        result.IsValid.Should().Be(expected);
    }
}
```

- [ ] **Step 2: Run — should fail (build errors)**

Run: `cd C:/temp/Dodostays/api && dotnet test tests/Dodostays.Api.Tests/Dodostays.Api.Tests.csproj --filter "FullyQualifiedName~SignUpValidatorTests"`

Expected: build errors (`SignUpValidator` not found).

- [ ] **Step 3: Add FluentValidation.TestHelper to test project**

Add to `Directory.Packages.props`:

```xml
<PackageVersion Include="FluentValidation" Version="11.10.0" />
```

(NOTE: `FluentValidation.AspNetCore` 11.3.0 is already there but TestHelper is in the core `FluentValidation` package.)

Add to `C:/temp/Dodostays/api/tests/Dodostays.Api.Tests/Dodostays.Api.Tests.csproj`:
```xml
<PackageReference Include="FluentValidation" />
```

- [ ] **Step 4: Create `SignUpValidator.cs`**

```csharp
using FluentValidation;
using Dodostays.Api.Contracts.Identity;

namespace Dodostays.Api.Modules.Identity.Validation;

public sealed class SignUpValidator : AbstractValidator<SignUpRequest>
{
    private static readonly string[] AllowedLanguages = { "en", "fr", "mfe" };

    public SignUpValidator()
    {
        RuleFor(r => r.Email).NotEmpty().EmailAddress().MaximumLength(256);
        RuleFor(r => r.Password)
            .NotEmpty()
            .MinimumLength(10)
            .Matches("[A-Z]").WithMessage("Password must contain an uppercase letter.")
            .Matches("[a-z]").WithMessage("Password must contain a lowercase letter.")
            .Matches("[0-9]").WithMessage("Password must contain a digit.");
        RuleFor(r => r.DisplayName).NotEmpty().MaximumLength(120);
        RuleFor(r => r.PreferredLanguage)
            .NotEmpty()
            .Must(l => AllowedLanguages.Contains(l, StringComparer.OrdinalIgnoreCase))
            .WithMessage($"Preferred language must be one of: {string.Join(", ", AllowedLanguages)}.");
        RuleFor(r => r.IntendedRole).IsInEnum();
    }
}
```

- [ ] **Step 5: Create `RefreshTokenStore.cs`**

```csharp
using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Modules.Common.Database;
using Dodostays.Api.Modules.Identity.Domain;

namespace Dodostays.Api.Modules.Identity.Auth;

public sealed class RefreshTokenStore
{
    private readonly DodostaysDbContext _db;
    private readonly JwtTokenIssuer _issuer;

    public RefreshTokenStore(DodostaysDbContext db, JwtTokenIssuer issuer)
    {
        _db = db;
        _issuer = issuer;
    }

    public async Task<(string Raw, RefreshToken Stored)> CreateAsync(Guid userId, CancellationToken ct)
    {
        var (raw, hash) = _issuer.IssueRefreshToken();
        var token = new RefreshToken
        {
            UserId = userId,
            TokenHash = hash,
            ExpiresAt = DateTimeOffset.UtcNow.Add(_issuer.RefreshTokenLifetime)
        };
        _db.RefreshTokens.Add(token);
        await _db.SaveChangesAsync(ct);
        return (raw, token);
    }

    public async Task<RefreshToken?> FindActiveAsync(string raw, CancellationToken ct)
    {
        var hash = _issuer.HashRefreshToken(raw);
        var token = await _db.RefreshTokens
            .SingleOrDefaultAsync(t => t.TokenHash == hash, ct);
        return token is { } t && t.IsActive ? t : null;
    }

    public async Task<(string Raw, RefreshToken Stored)> RotateAsync(RefreshToken existing, CancellationToken ct)
    {
        var (raw, replacement) = await CreateAsync(existing.UserId, ct);
        existing.Revoke();
        existing.ReplacedByTokenId = replacement.Id;
        await _db.SaveChangesAsync(ct);
        return (raw, replacement);
    }

    public async Task RevokeAllForUserAsync(Guid userId, CancellationToken ct)
    {
        var active = await _db.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null)
            .ToListAsync(ct);
        var now = DateTimeOffset.UtcNow;
        foreach (var t in active) t.RevokedAt = now;
        await _db.SaveChangesAsync(ct);
    }
}
```

- [ ] **Step 6: Create `SignUpEndpoint.cs`**

```csharp
using FluentValidation;
using Microsoft.AspNetCore.Http.HttpResults;
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
        Microsoft.EntityFrameworkCore.DbContext db,
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
```

- [ ] **Step 7: Update `IdentityModule.cs` to register validator, refresh-token store, and the endpoint**

Replace the existing file content with:

```csharp
using FluentValidation;
using Microsoft.AspNetCore.Identity;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Common.Database;
using Dodostays.Api.Modules.Identity.Auth;
using Dodostays.Api.Modules.Identity.Domain;
using Dodostays.Api.Modules.Identity.Endpoints;
using Dodostays.Api.Modules.Identity.Kyc;
using Dodostays.Api.Modules.Identity.Services;
using Dodostays.Api.Modules.Identity.Validation;

namespace Dodostays.Api.Modules.Identity;

public static class IdentityModule
{
    public static IServiceCollection AddIdentityModule(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddIdentityCore<DodostaysUser>(opts =>
            {
                opts.Password.RequireDigit = true;
                opts.Password.RequireLowercase = true;
                opts.Password.RequireUppercase = true;
                opts.Password.RequiredLength = 10;
                opts.User.RequireUniqueEmail = true;
            })
            .AddRoles<DodostaysRole>()
            .AddEntityFrameworkStores<DodostaysDbContext>()
            .AddDefaultTokenProviders();

        services.AddDodostaysJwtAuth(configuration);

        services.Configure<KycOptions>(configuration.GetSection("Kyc"));
        var kycProvider = configuration["Kyc:Provider"] ?? "InMemory";
        if (string.Equals(kycProvider, "Onfido", StringComparison.OrdinalIgnoreCase))
            services.AddHttpClient<IKycVerifier, OnfidoKycVerifier>();
        else
            services.AddSingleton<IKycVerifier, InMemoryKycVerifier>();

        services.AddScoped<RefreshTokenStore>();
        services.AddScoped<IValidator<SignUpRequest>, SignUpValidator>();

        services.AddHttpContextAccessor();
        services.AddScoped<IUserContext, UserContext>();

        return services;
    }

    public static IEndpointRouteBuilder MapIdentityEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapSignUp();
        return app;
    }
}
```

- [ ] **Step 8: Run the unit test — should pass**

Run: `cd C:/temp/Dodostays/api && dotnet test tests/Dodostays.Api.Tests/Dodostays.Api.Tests.csproj --filter "FullyQualifiedName~SignUpValidatorTests"`

Expected: 8 passing.

- [ ] **Step 9: Write the integration test**

Create `C:/temp/Dodostays/api/tests/Dodostays.Api.IntegrationTests/Identity/SignUpFlowTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Dodostays.Api.Contracts.Identity;

namespace Dodostays.Api.IntegrationTests.Identity;

public class SignUpFlowTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fx;

    public SignUpFlowTests(PostgresFixture fx) => _fx = fx;

    [Fact]
    public async Task SignUp_creates_user_and_returns_token()
    {
        using var factory = _fx.CreateFactory();
        var client = factory.CreateClient();

        var email = $"signup-{Guid.NewGuid():N}@test.dodostays.local";
        var req = new SignUpRequest(email, "Aa1!aaaaaa", "Test User", "en", UserRole.Guest);

        var res = await client.PostAsJsonAsync("/api/identity/signup", req);

        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await res.Content.ReadFromJsonAsync<AuthResponse>();
        body.Should().NotBeNull();
        body!.AccessToken.Should().NotBeNullOrEmpty();
        body.User.Email.Should().Be(email);
        body.User.Role.Should().Be(UserRole.Guest);
        body.User.KycStatus.Should().Be(KycStatus.Verified); // InMemory verifier auto-approves
        res.Headers.GetValues("Set-Cookie").Should().Contain(c => c.StartsWith("ds_rt=") || c.Contains("ds_rt="));
    }

    [Fact]
    public async Task SignUp_rejects_admin_role_attempts()
    {
        using var factory = _fx.CreateFactory();
        var client = factory.CreateClient();

        var req = new SignUpRequest($"admin-{Guid.NewGuid():N}@x.com", "Aa1!aaaaaa", "Bad", "en", UserRole.Admin);

        var res = await client.PostAsJsonAsync("/api/identity/signup", req);

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task SignUp_rejects_duplicate_email()
    {
        using var factory = _fx.CreateFactory();
        var client = factory.CreateClient();
        var email = $"dup-{Guid.NewGuid():N}@test.dodostays.local";
        var req = new SignUpRequest(email, "Aa1!aaaaaa", "Dup", "en", UserRole.Guest);

        (await client.PostAsJsonAsync("/api/identity/signup", req)).StatusCode.Should().Be(HttpStatusCode.OK);
        var res = await client.PostAsJsonAsync("/api/identity/signup", req);

        ((int)res.StatusCode).Should().Be(StatusCodes.Status409Conflict);
    }
}
```

NOTE: The integration test fixture `PostgresFixture` (from Task 0.8) uses the Testcontainers Postgres image; configuration must include valid `Jwt` settings or the JWT issuer will throw on startup. Check that `PostgresFixture.CreateFactory()` calls `builder.UseSetting("Jwt:SigningKey", "test-test-test-test-test-test-test-test")` (or equivalent). If not, modify `PostgresFixture.cs` to add these settings before this test runs.

- [ ] **Step 10: Update `PostgresFixture.cs` to provide JWT/Kyc dev config**

Read `C:/temp/Dodostays/api/tests/Dodostays.Api.IntegrationTests/PostgresFixture.cs` and modify the `CreateFactory()` method to inject the additional settings. Final method should be:

```csharp
public WebApplicationFactory<Program> CreateFactory() =>
    new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
    {
        builder.UseSetting("ConnectionStrings:Postgres", ConnectionString);
        builder.UseSetting("Jwt:Issuer", "dodostays-test");
        builder.UseSetting("Jwt:Audience", "dodostays-test");
        builder.UseSetting("Jwt:SigningKey", "test-signing-key-must-be-at-least-32-chars-long-please");
        builder.UseSetting("Jwt:AccessTokenLifetime", "00:15:00");
        builder.UseSetting("Jwt:RefreshTokenLifetime", "30.00:00:00");
        builder.UseSetting("Kyc:Provider", "InMemory");
    });
```

- [ ] **Step 11: Run integration tests**

```bash
cd C:/temp/Dodostays/api
dotnet test tests/Dodostays.Api.IntegrationTests/Dodostays.Api.IntegrationTests.csproj --filter "FullyQualifiedName~SignUpFlowTests"
```

Expected: 3 passing.

- [ ] **Step 12: Commit**

```bash
git -C C:/temp/Dodostays add api/
git -C C:/temp/Dodostays commit -m "feat(identity): /api/identity/signup endpoint with validation, refresh-token cookie, KYC start"
```

---

## Task 1.9: Sign-in, refresh, sign-out, /me endpoints

**Files:**
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Identity/Validation/SignInValidator.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Identity/Endpoints/SignInEndpoint.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Identity/Endpoints/RefreshEndpoint.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Identity/Endpoints/SignOutEndpoint.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Identity/Endpoints/MeEndpoint.cs`
- Modify: `IdentityModule.cs` to map these
- Test: `C:/temp/Dodostays/api/tests/Dodostays.Api.IntegrationTests/Identity/SignInFlowTests.cs`
- Test: `C:/temp/Dodostays/api/tests/Dodostays.Api.IntegrationTests/Identity/RefreshFlowTests.cs`
- Test: `C:/temp/Dodostays/api/tests/Dodostays.Api.IntegrationTests/Identity/MeEndpointTests.cs`

- [ ] **Step 1: Write `SignInFlowTests.cs`**

```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Dodostays.Api.Contracts.Identity;

namespace Dodostays.Api.IntegrationTests.Identity;

public class SignInFlowTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fx;

    public SignInFlowTests(PostgresFixture fx) => _fx = fx;

    [Fact]
    public async Task SignIn_succeeds_with_correct_password()
    {
        using var factory = _fx.CreateFactory();
        var client = factory.CreateClient();

        var email = $"signin-{Guid.NewGuid():N}@test.dodostays.local";
        var password = "Aa1!aaaaaa";
        await client.PostAsJsonAsync("/api/identity/signup",
            new SignUpRequest(email, password, "Test", "en", UserRole.Guest));

        var res = await client.PostAsJsonAsync("/api/identity/signin",
            new SignInRequest(email, password));

        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await res.Content.ReadFromJsonAsync<AuthResponse>();
        body!.AccessToken.Should().NotBeNullOrEmpty();
        body.User.Email.Should().Be(email);
    }

    [Fact]
    public async Task SignIn_returns_401_on_wrong_password()
    {
        using var factory = _fx.CreateFactory();
        var client = factory.CreateClient();

        var email = $"signin-fail-{Guid.NewGuid():N}@test.dodostays.local";
        await client.PostAsJsonAsync("/api/identity/signup",
            new SignUpRequest(email, "Aa1!aaaaaa", "Test", "en", UserRole.Guest));

        var res = await client.PostAsJsonAsync("/api/identity/signin",
            new SignInRequest(email, "WrongPass1!"));

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
```

- [ ] **Step 2: Run — should fail (build errors)**

Expected: build errors.

- [ ] **Step 3: Create `SignInValidator.cs`**

```csharp
using FluentValidation;
using Dodostays.Api.Contracts.Identity;

namespace Dodostays.Api.Modules.Identity.Validation;

public sealed class SignInValidator : AbstractValidator<SignInRequest>
{
    public SignInValidator()
    {
        RuleFor(r => r.Email).NotEmpty().EmailAddress();
        RuleFor(r => r.Password).NotEmpty();
    }
}
```

- [ ] **Step 4: Create `SignInEndpoint.cs`**

```csharp
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
```

- [ ] **Step 5: Create `RefreshEndpoint.cs`**

```csharp
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
```

- [ ] **Step 6: Create `SignOutEndpoint.cs`**

```csharp
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
```

- [ ] **Step 7: Create `MeEndpoint.cs`**

```csharp
using Dodostays.Api.Contracts.Identity;

namespace Dodostays.Api.Modules.Identity.Endpoints;

internal static class MeEndpoint
{
    public static RouteHandlerBuilder MapMe(this IEndpointRouteBuilder app)
    {
        return app.MapGet("/api/identity/me", HandleAsync).RequireAuthorization();
    }

    private static async Task<IResult> HandleAsync(
        IUserContext userContext,
        CancellationToken ct)
    {
        var user = await userContext.GetCurrentUserAsync(ct);
        return user is null ? Results.Unauthorized() : Results.Ok(user);
    }
}
```

- [ ] **Step 8: Update `IdentityModule.cs` to register validators and map all four new endpoints**

In `MapIdentityEndpoints`, add after `MapSignUp()`:

```csharp
app.MapSignIn();
app.MapRefresh();
app.MapSignOutEndpoint();
app.MapMe();
```

In `AddIdentityModule`, add:

```csharp
services.AddScoped<IValidator<SignInRequest>, SignInValidator>();
```

- [ ] **Step 9: Write `RefreshFlowTests.cs`**

```csharp
using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Dodostays.Api.Contracts.Identity;

namespace Dodostays.Api.IntegrationTests.Identity;

public class RefreshFlowTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fx;

    public RefreshFlowTests(PostgresFixture fx) => _fx = fx;

    [Fact]
    public async Task Refresh_with_cookie_returns_new_access_token()
    {
        using var factory = _fx.CreateFactory();
        var handler = factory.Server.CreateHandler();
        var cookieJar = new System.Net.CookieContainer();
        using var inner = new System.Net.Http.SocketsHttpHandler { CookieContainer = cookieJar, UseCookies = true };
        // Use the factory's HttpClient (handles cookies via CookieContainer not by default — use HandleCookies path).
        var client = factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
        {
            HandleCookies = true
        });

        var email = $"refresh-{Guid.NewGuid():N}@test.dodostays.local";
        var signupRes = await client.PostAsJsonAsync("/api/identity/signup",
            new SignUpRequest(email, "Aa1!aaaaaa", "Test", "en", UserRole.Guest));
        signupRes.StatusCode.Should().Be(HttpStatusCode.OK);

        var refreshRes = await client.PostAsync("/api/identity/refresh", null);

        refreshRes.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await refreshRes.Content.ReadFromJsonAsync<AuthResponse>();
        body!.AccessToken.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Refresh_returns_401_without_cookie()
    {
        using var factory = _fx.CreateFactory();
        var client = factory.CreateClient();

        var res = await client.PostAsync("/api/identity/refresh", null);

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
```

- [ ] **Step 10: Write `MeEndpointTests.cs`**

```csharp
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using Dodostays.Api.Contracts.Identity;

namespace Dodostays.Api.IntegrationTests.Identity;

public class MeEndpointTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fx;

    public MeEndpointTests(PostgresFixture fx) => _fx = fx;

    [Fact]
    public async Task Me_returns_current_user_with_valid_token()
    {
        using var factory = _fx.CreateFactory();
        var client = factory.CreateClient();

        var email = $"me-{Guid.NewGuid():N}@test.dodostays.local";
        var signup = await client.PostAsJsonAsync("/api/identity/signup",
            new SignUpRequest(email, "Aa1!aaaaaa", "Me Test", "en", UserRole.Guest));
        var auth = await signup.Content.ReadFromJsonAsync<AuthResponse>();

        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.AccessToken);
        var res = await client.GetAsync("/api/identity/me");

        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var user = await res.Content.ReadFromJsonAsync<UserDto>();
        user!.Email.Should().Be(email);
    }

    [Fact]
    public async Task Me_returns_401_without_token()
    {
        using var factory = _fx.CreateFactory();
        var client = factory.CreateClient();

        var res = await client.GetAsync("/api/identity/me");

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
```

- [ ] **Step 11: Run all integration tests**

```bash
cd C:/temp/Dodostays/api
dotnet test tests/Dodostays.Api.IntegrationTests/Dodostays.Api.IntegrationTests.csproj --filter "FullyQualifiedName~Identity"
```

Expected: 9 passing (3 from SignUp + 2 SignIn + 2 Refresh + 2 Me).

- [ ] **Step 12: Commit**

```bash
git -C C:/temp/Dodostays add api/
git -C C:/temp/Dodostays commit -m "feat(identity): /signin, /refresh, /signout, /me endpoints with integration tests"
```

---

## Task 1.10: Host onboarding endpoints

**Files:**
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Identity/Validation/HostProfileValidator.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Identity/Services/HostOnboardingService.cs`
- Create: `C:/temp/Dodostays/api/src/Dodostays.Api/Modules/Identity/Endpoints/HostProfileEndpoints.cs`
- Modify: `IdentityModule.cs` to map and register
- Test: `C:/temp/Dodostays/api/tests/Dodostays.Api.Tests/Identity/HostProfileValidatorTests.cs`
- Test: `C:/temp/Dodostays/api/tests/Dodostays.Api.IntegrationTests/Identity/HostOnboardingFlowTests.cs`

- [ ] **Step 1: Write `HostProfileValidatorTests.cs`**

```csharp
using FluentAssertions;
using FluentValidation.TestHelper;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Identity.Validation;

namespace Dodostays.Api.Tests.Identity;

public class HostProfileValidatorTests
{
    private readonly HostProfileValidator _v = new();

    [Fact]
    public void Valid_profile_passes()
    {
        var dto = new HostProfileDto(
            UserId: Guid.NewGuid(),
            LegalName: "Mauritius Hosts Ltd",
            TamLicenseNumber: "TAM/2024/12345",
            VatNumber: "VAT12345678",
            BankAccountLast4: "1234",
            BankName: "MCB");
        _v.TestValidate(dto).IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData("")]
    [InlineData("AB")]
    [InlineData("12345")]
    public void TamLicenseNumber_must_be_at_least_6_chars(string tam)
    {
        var dto = new HostProfileDto(Guid.NewGuid(), "L", tam, null, null, null);
        var result = _v.TestValidate(dto);
        result.ShouldHaveValidationErrorFor(x => x.TamLicenseNumber);
    }

    [Fact]
    public void Empty_legal_name_fails()
    {
        var dto = new HostProfileDto(Guid.NewGuid(), "", "TAM/2024/12345", null, null, null);
        _v.TestValidate(dto).ShouldHaveValidationErrorFor(x => x.LegalName);
    }
}
```

- [ ] **Step 2: Run — should fail**

Expected: build errors.

- [ ] **Step 3: Create `HostProfileValidator.cs`**

```csharp
using FluentValidation;
using Dodostays.Api.Contracts.Identity;

namespace Dodostays.Api.Modules.Identity.Validation;

public sealed class HostProfileValidator : AbstractValidator<HostProfileDto>
{
    public HostProfileValidator()
    {
        RuleFor(x => x.LegalName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.TamLicenseNumber)
            .NotEmpty()
            .MinimumLength(6)
            .MaximumLength(64);
        RuleFor(x => x.VatNumber).MaximumLength(64);
        RuleFor(x => x.BankAccountLast4)
            .Matches("^[0-9]{4}$")
            .When(x => !string.IsNullOrEmpty(x.BankAccountLast4))
            .WithMessage("BankAccountLast4 must be exactly 4 digits.");
        RuleFor(x => x.BankName).MaximumLength(120);
    }
}
```

- [ ] **Step 4: Create `HostOnboardingService.cs`**

```csharp
using Microsoft.EntityFrameworkCore;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Common.Database;
using Dodostays.Api.Modules.Identity.Domain;

namespace Dodostays.Api.Modules.Identity.Services;

public sealed class HostOnboardingService
{
    private readonly DodostaysDbContext _db;

    public HostOnboardingService(DodostaysDbContext db) => _db = db;

    public async Task<HostProfileDto> UpsertAsync(Guid userId, HostProfileDto dto, CancellationToken ct)
    {
        var user = await _db.Users.SingleAsync(u => u.Id == userId, ct);
        if (user.Role != UserRole.Host)
        {
            user.Role = UserRole.Host;
        }

        var existing = await _db.HostProfiles.SingleOrDefaultAsync(h => h.UserId == userId, ct);
        if (existing is null)
        {
            existing = new HostProfile { UserId = userId, CreatedAt = DateTimeOffset.UtcNow };
            _db.HostProfiles.Add(existing);
        }

        existing.LegalName = dto.LegalName;
        existing.TamLicenseNumber = dto.TamLicenseNumber;
        existing.VatNumber = dto.VatNumber;
        existing.BankAccountLast4 = dto.BankAccountLast4;
        existing.BankName = dto.BankName;
        existing.UpdatedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync(ct);

        return new HostProfileDto(userId, existing.LegalName, existing.TamLicenseNumber,
            existing.VatNumber, existing.BankAccountLast4, existing.BankName);
    }

    public async Task<HostProfileDto?> GetAsync(Guid userId, CancellationToken ct)
    {
        var hp = await _db.HostProfiles.AsNoTracking().SingleOrDefaultAsync(h => h.UserId == userId, ct);
        return hp is null ? null : new HostProfileDto(hp.UserId, hp.LegalName, hp.TamLicenseNumber, hp.VatNumber, hp.BankAccountLast4, hp.BankName);
    }
}
```

- [ ] **Step 5: Create `HostProfileEndpoints.cs`**

```csharp
using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Dodostays.Api.Contracts.Identity;
using Dodostays.Api.Modules.Identity.Services;

namespace Dodostays.Api.Modules.Identity.Endpoints;

internal static class HostProfileEndpoints
{
    public static IEndpointRouteBuilder MapHostProfile(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/identity/host-profile", GetAsync).RequireAuthorization();
        app.MapPut("/api/identity/host-profile", UpsertAsync).RequireAuthorization();
        return app;
    }

    private static async Task<IResult> GetAsync(
        IUserContext userContext,
        HostOnboardingService service,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        var profile = await service.GetAsync(user.Id, ct);
        return profile is null ? Results.NotFound() : Results.Ok(profile);
    }

    private static async Task<IResult> UpsertAsync(
        [FromBody] HostProfileDto dto,
        IUserContext userContext,
        IValidator<HostProfileDto> validator,
        HostOnboardingService service,
        CancellationToken ct)
    {
        var user = await userContext.RequireUserAsync(ct);
        var validation = await validator.ValidateAsync(dto, ct);
        if (!validation.IsValid)
            return Results.ValidationProblem(validation.ToDictionary());

        var saved = await service.UpsertAsync(user.Id, dto with { UserId = user.Id }, ct);
        return Results.Ok(saved);
    }
}
```

- [ ] **Step 6: Update `IdentityModule.cs`**

In `AddIdentityModule`, add:
```csharp
services.AddScoped<IValidator<HostProfileDto>, HostProfileValidator>();
services.AddScoped<HostOnboardingService>();
```

In `MapIdentityEndpoints`, add:
```csharp
app.MapHostProfile();
```

- [ ] **Step 7: Write `HostOnboardingFlowTests.cs`**

```csharp
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using Dodostays.Api.Contracts.Identity;

namespace Dodostays.Api.IntegrationTests.Identity;

public class HostOnboardingFlowTests : IClassFixture<PostgresFixture>
{
    private readonly PostgresFixture _fx;

    public HostOnboardingFlowTests(PostgresFixture fx) => _fx = fx;

    [Fact]
    public async Task Upsert_then_get_round_trips_profile()
    {
        using var factory = _fx.CreateFactory();
        var client = factory.CreateClient();

        var email = $"host-{Guid.NewGuid():N}@test.dodostays.local";
        var signup = await client.PostAsJsonAsync("/api/identity/signup",
            new SignUpRequest(email, "Aa1!aaaaaa", "Host Test", "fr", UserRole.Host));
        var auth = await signup.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.AccessToken);

        var dto = new HostProfileDto(
            UserId: Guid.Empty, // will be overwritten by endpoint
            LegalName: "Mauritius Beach Villas Ltd",
            TamLicenseNumber: "TAM/2024/77777",
            VatNumber: "VAT22222222",
            BankAccountLast4: "9876",
            BankName: "MCB");

        var put = await client.PutAsJsonAsync("/api/identity/host-profile", dto);
        put.StatusCode.Should().Be(HttpStatusCode.OK);
        var saved = await put.Content.ReadFromJsonAsync<HostProfileDto>();
        saved!.UserId.Should().Be(auth.User.Id);
        saved.TamLicenseNumber.Should().Be("TAM/2024/77777");

        var get = await client.GetAsync("/api/identity/host-profile");
        get.StatusCode.Should().Be(HttpStatusCode.OK);
        var fetched = await get.Content.ReadFromJsonAsync<HostProfileDto>();
        fetched!.LegalName.Should().Be("Mauritius Beach Villas Ltd");
    }

    [Fact]
    public async Task Get_returns_404_when_no_profile_yet()
    {
        using var factory = _fx.CreateFactory();
        var client = factory.CreateClient();

        var email = $"noprofile-{Guid.NewGuid():N}@test.dodostays.local";
        var signup = await client.PostAsJsonAsync("/api/identity/signup",
            new SignUpRequest(email, "Aa1!aaaaaa", "Test", "en", UserRole.Guest));
        var auth = await signup.Content.ReadFromJsonAsync<AuthResponse>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", auth!.AccessToken);

        var res = await client.GetAsync("/api/identity/host-profile");
        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
```

- [ ] **Step 8: Run tests**

```bash
cd C:/temp/Dodostays/api
dotnet test tests/Dodostays.Api.Tests/Dodostays.Api.Tests.csproj --filter "FullyQualifiedName~HostProfileValidator"
dotnet test tests/Dodostays.Api.IntegrationTests/Dodostays.Api.IntegrationTests.csproj --filter "FullyQualifiedName~HostOnboarding"
```

Expected: unit 5 passing, integration 2 passing.

- [ ] **Step 9: Commit**

```bash
git -C C:/temp/Dodostays add api/
git -C C:/temp/Dodostays commit -m "feat(identity): host onboarding endpoints (PUT/GET /api/identity/host-profile)"
```

---

## Task 1.11: Frontend auth client + sign-in/sign-up pages

**Files:**
- Create: `C:/temp/Dodostays/web/src/lib/auth.ts`
- Create: `C:/temp/Dodostays/web/src/lib/auth-context.tsx`
- Create: `C:/temp/Dodostays/web/src/lib/use-user.ts`
- Modify: `C:/temp/Dodostays/web/src/app/layout.tsx` (wrap in AuthProvider)
- Create: `C:/temp/Dodostays/web/src/app/signup/page.tsx`
- Create: `C:/temp/Dodostays/web/src/app/signup/role-picker.tsx`
- Create: `C:/temp/Dodostays/web/src/app/signin/page.tsx`
- Create: `C:/temp/Dodostays/web/src/app/account/page.tsx`
- Modify: `C:/temp/Dodostays/web/src/app/page.tsx` (add nav links)
- Test: `C:/temp/Dodostays/web/e2e/auth.spec.ts`

- [ ] **Step 1: Modify `apiFetch` in `C:/temp/Dodostays/web/src/lib/api-client.ts` to send credentials**

Replace with:

```ts
const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5080";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    credentials: "include",
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export function buildApiUrl(path: string): string {
  return `${baseUrl}${path}`;
}
```

- [ ] **Step 2: Create `C:/temp/Dodostays/web/src/lib/auth.ts`**

```ts
import { apiFetch, buildApiUrl } from "./api-client";

export type UserRole = "Guest" | "Host" | "Admin" | "Inspector";
export type KycStatus = "NotStarted" | "Pending" | "Verified" | "Failed" | "ManualReview";

export interface User {
  id: string;
  email: string;
  displayName: string;
  preferredLanguage: string;
  role: UserRole;
  kycStatus: KycStatus;
  twoFactorEnabled: boolean;
}

export interface AuthResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  user: User;
}

export interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
  preferredLanguage: string;
  intendedRole: UserRole;
}

export async function signUp(input: SignUpInput): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/identity/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function signIn(email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/api/identity/signin", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function refreshAccessToken(): Promise<AuthResponse | null> {
  const res = await fetch(buildApiUrl("/api/identity/refresh"), {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) return null;
  return res.json() as Promise<AuthResponse>;
}

export async function signOut(accessToken: string): Promise<void> {
  await fetch(buildApiUrl("/api/identity/signout"), {
    method: "POST",
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export async function fetchMe(accessToken: string): Promise<User | null> {
  const res = await fetch(buildApiUrl("/api/identity/me"), {
    credentials: "include",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return res.json() as Promise<User>;
}
```

- [ ] **Step 3: Create `C:/temp/Dodostays/web/src/lib/auth-context.tsx`**

```tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { refreshAccessToken, signIn as apiSignIn, signOut as apiSignOut, signUp as apiSignUp, type SignUpInput, type User } from "./auth";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
}

interface AuthApi extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    refreshAccessToken().then((res) => {
      if (cancelled) return;
      if (res) {
        setAccessToken(res.accessToken);
        setUser(res.user);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await apiSignIn(email, password);
    setAccessToken(res.accessToken);
    setUser(res.user);
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    const res = await apiSignUp(input);
    setAccessToken(res.accessToken);
    setUser(res.user);
  }, []);

  const signOut = useCallback(async () => {
    if (accessToken) await apiSignOut(accessToken);
    setAccessToken(null);
    setUser(null);
  }, [accessToken]);

  const value = useMemo<AuthApi>(
    () => ({ user, accessToken, loading, signIn, signUp, signOut }),
    [user, accessToken, loading, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
```

- [ ] **Step 4: Create `C:/temp/Dodostays/web/src/lib/use-user.ts`**

```ts
"use client";

import { useAuth } from "./auth-context";

export function useUser() {
  const { user, loading } = useAuth();
  return { user, loading, isAuthenticated: user !== null };
}
```

- [ ] **Step 5: Modify `C:/temp/Dodostays/web/src/app/layout.tsx` to wrap in `AuthProvider`**

Open the existing `layout.tsx` and add the import and wrap children. Final shape (replace metadata/font block as needed; the only requirement is wrapping `{children}` in `<AuthProvider>`):

```tsx
import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "DodoStays",
  description: "Mauritius. Real prices. Instant book.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 6: Create `C:/temp/Dodostays/web/src/app/signup/role-picker.tsx`**

```tsx
"use client";

import type { UserRole } from "@/lib/auth";

interface Props {
  value: "Guest" | "Host";
  onChange: (role: "Guest" | "Host") => void;
}

export function RolePicker({ value, onChange }: Props) {
  return (
    <fieldset className="grid grid-cols-2 gap-2">
      <label className={`cursor-pointer rounded border p-3 text-center ${value === "Guest" ? "border-black" : "border-gray-300"}`}>
        <input
          type="radio"
          name="role"
          value="Guest"
          checked={value === "Guest"}
          onChange={() => onChange("Guest")}
          className="sr-only"
        />
        I'm a guest
      </label>
      <label className={`cursor-pointer rounded border p-3 text-center ${value === "Host" ? "border-black" : "border-gray-300"}`}>
        <input
          type="radio"
          name="role"
          value="Host"
          checked={value === "Host"}
          onChange={() => onChange("Host")}
          className="sr-only"
        />
        I'm a host
      </label>
    </fieldset>
  );
}

export type { Props as RolePickerProps };
```

- [ ] **Step 7: Create `C:/temp/Dodostays/web/src/app/signup/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { RolePicker } from "./role-picker";

export default function SignUpPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [language, setLanguage] = useState("en");
  const [role, setRole] = useState<"Guest" | "Host">("Guest");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signUp({ email, password, displayName, preferredLanguage: language, intendedRole: role });
      router.push("/account");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-8">
      <h1 className="mb-6 text-3xl font-bold">Create your DodoStays account</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <RolePicker value={role} onChange={setRole} />
        <input
          type="email"
          required
          placeholder="Email"
          className="w-full rounded border border-gray-300 p-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="text"
          required
          placeholder="Display name"
          className="w-full rounded border border-gray-300 p-3"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
        <select
          className="w-full rounded border border-gray-300 p-3"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="en">English</option>
          <option value="fr">Français</option>
          <option value="mfe">Kreol Morisien</option>
        </select>
        <input
          type="password"
          required
          minLength={10}
          placeholder="Password (10+ chars, mixed case, digit)"
          className="w-full rounded border border-gray-300 p-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-black p-3 text-white disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm">
        Already have an account? <Link href="/signin" className="underline">Sign in</Link>
      </p>
    </main>
  );
}
```

- [ ] **Step 8: Create `C:/temp/Dodostays/web/src/app/signin/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function SignInPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      router.push("/account");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-8">
      <h1 className="mb-6 text-3xl font-bold">Sign in to DodoStays</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="email"
          required
          placeholder="Email"
          className="w-full rounded border border-gray-300 p-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          required
          placeholder="Password"
          className="w-full rounded border border-gray-300 p-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-black p-3 text-white disabled:opacity-50"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm">
        New to DodoStays? <Link href="/signup" className="underline">Create an account</Link>
      </p>
    </main>
  );
}
```

- [ ] **Step 9: Create `C:/temp/Dodostays/web/src/app/account/page.tsx`**

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/signin");
  }, [loading, user, router]);

  if (loading) return <main className="p-8">Loading…</main>;
  if (!user) return null;

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-3xl font-bold">Welcome, {user.displayName}</h1>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="font-semibold">Email</dt><dd>{user.email}</dd>
        <dt className="font-semibold">Role</dt><dd>{user.role}</dd>
        <dt className="font-semibold">KYC</dt><dd>{user.kycStatus}</dd>
        <dt className="font-semibold">Language</dt><dd>{user.preferredLanguage}</dd>
      </dl>
      <button
        type="button"
        onClick={async () => {
          await signOut();
          router.push("/");
        }}
        className="mt-8 rounded border border-black px-4 py-2"
      >
        Sign out
      </button>
    </main>
  );
}
```

- [ ] **Step 10: Update `C:/temp/Dodostays/web/src/app/page.tsx` to add sign-in/sign-up nav**

Replace with:

```tsx
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <nav className="flex justify-end gap-4 p-4">
        <Link href="/signin" className="text-sm hover:underline">Sign in</Link>
        <Link href="/signup" className="rounded bg-black px-3 py-1 text-sm text-white">Sign up</Link>
      </nav>
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold">DodoStays</h1>
          <p className="mt-2 text-gray-600">Mauritius. Real prices. Instant book.</p>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 11: Write Playwright auth test**

Create `C:/temp/Dodostays/web/e2e/auth.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

const apiBase = process.env.E2E_API_BASE ?? "http://localhost:5080";

test.beforeAll(async ({ request }) => {
  // Ensure backend is reachable; if not, skip the suite.
  const res = await request.get(`${apiBase}/health/live`);
  test.skip(!res.ok(), "Backend API not reachable on " + apiBase);
});

test("sign-up creates account and redirects to /account", async ({ page }) => {
  const email = `e2e-${Date.now()}@test.dodostays.local`;
  await page.goto("/signup");

  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Display name").fill("E2E User");
  await page.getByPlaceholder("Password (10+ chars, mixed case, digit)").fill("Aa1!aaaaaa");

  await page.getByRole("button", { name: /create account/i }).click();

  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { name: /welcome/i })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
});
```

- [ ] **Step 12: Run typecheck, lint, e2e**

Make sure backend (`dotnet run --project src/Dodostays.Api`) and frontend (`npm run dev`) are both running locally OR the Playwright suite will skip the auth test. Then:

```bash
cd C:/temp/Dodostays/web
npm run typecheck
npm run lint
npm run test:e2e
```

Expected: typecheck clean, lint clean, 2 Playwright tests passing (smoke from Plan 00 + new auth test).

If the test skips (backend not reachable), START the backend first:
```bash
cd C:/temp/Dodostays/api && dotnet run --project src/Dodostays.Api &
sleep 8
cd C:/temp/Dodostays/web && npm run test:e2e
```

- [ ] **Step 13: Commit**

```bash
git -C C:/temp/Dodostays add web/
git -C C:/temp/Dodostays commit -m "feat(web): sign-in / sign-up / account pages with auth context"
```

---

## Task 1.12: Manual end-to-end verification (browser)

This is a **manual** verification step. Don't dispatch a subagent for this — the user verifies in the browser themselves.

- [ ] **Step 1: Ensure backend + frontend running**

```bash
# Terminal 1
cd C:/temp/Dodostays/api && dotnet run --project src/Dodostays.Api

# Terminal 2
cd C:/temp/Dodostays/web && npm run dev
```

- [ ] **Step 2: Browser flow**

- Open http://localhost:3000 — homepage shows "Sign in" / "Sign up" links
- Click "Sign up" → fill form (use a real email, password `Aa1!aaaaaa` minimum)
- Submit → redirects to `/account`, shows your details with `KYC: Verified` (in-memory verifier)
- Click "Sign out" → redirects to homepage
- Click "Sign in" → enter credentials → redirects to `/account`
- Refresh page (`F5`) → should remain on `/account` (refresh-token cookie restores session)
- Use a host signup: pick "I'm a host" → after signup, role shows "Host"

- [ ] **Step 3: Sanity-check the database**

```bash
docker exec dodostays-postgres psql -U dodostays -d dodostays -c "SELECT \"DisplayName\", \"Email\", \"Role\", \"KycStatus\" FROM \"AspNetUsers\" ORDER BY \"CreatedAt\" DESC LIMIT 5;"
```

Expected: see rows for each test signup with the right roles.

- [ ] **Step 4: Stop the API + frontend**

If everything works, you're done with Plan 01.

---

## Definition of Done — Plan 01 Identity & KYC

- [ ] `Dodostays.Api.Contracts.Identity` namespace exists with `IUserContext`, all DTOs
- [ ] `DodostaysDbContext` extends `IdentityDbContext<DodostaysUser, DodostaysRole, Guid>`
- [ ] EF migration `AddIdentitySchema` applied; all Identity tables present in the dodostays DB
- [ ] `IKycVerifier` interface with `InMemoryKycVerifier` (default) and `OnfidoKycVerifier` (skeleton, throws NotImplementedException)
- [ ] Endpoints live: `POST /signup`, `POST /signin`, `POST /refresh`, `POST /signout`, `GET /me`, `GET/PUT /host-profile`
- [ ] Refresh token cookie httpOnly, scoped to `/api/identity`, hashed in DB
- [ ] Access token JWT, 15-min lifetime, signed with `Jwt:SigningKey`
- [ ] Validators: `SignUpValidator`, `SignInValidator`, `HostProfileValidator`
- [ ] Unit tests: `JwtTokenIssuerTests` (2), `InMemoryKycVerifierTests` (2), `SignUpValidatorTests` (8), `HostProfileValidatorTests` (5) — total 17 unit
- [ ] Integration tests: `SignUpFlowTests` (3), `SignInFlowTests` (2), `RefreshFlowTests` (2), `MeEndpointTests` (2), `HostOnboardingFlowTests` (2) — total 11 integration
- [ ] Frontend: `/signin`, `/signup`, `/account` pages working; auth context restores session; Playwright `auth.spec.ts` passes
- [ ] Manual browser verification (Task 1.12) passes

**Out of scope (NOT in Plan 01):**
- Real Onfido HTTP integration (skeleton only; gated by `Kyc:Provider == "Onfido"`)
- Google OAuth (deferred — covered by Task 1.13 stub below if you want it; see Open Items)
- Email verification flow / forgot-password
- 2FA TOTP (Identity supports it, no UI yet)
- Account deletion API
- Admin user-management UI

## Open Items (deferred)

1. **Google OAuth callback endpoint** — `Microsoft.AspNetCore.Authentication.Google` is wired-able, but the spec mentions it as MVP-optional. Add `GoogleCallbackEndpoint.cs` in a follow-up plan once we have a domain + Google Cloud project for OAuth credentials.
2. **Email verification** — Identity supports it (`AddDefaultTokenProviders()` is wired); needs an email send transport. Wait until Plan 04 (Payments) which introduces Resend integration.
3. **Real Onfido integration** — implement `OnfidoKycVerifier.StartAsync` against the Onfido REST API once the launch readiness work begins. The KYC abstraction is already in place; this is purely an HTTP adapter to write.
4. **Inspector role onboarding** — admin-only invite flow to create `Inspector` accounts. Deferred to Plan 02 (when Verified-listing inspections become a real flow).
