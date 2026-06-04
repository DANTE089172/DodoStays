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
