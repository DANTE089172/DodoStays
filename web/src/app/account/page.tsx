"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { Section } from "@/components/marketing/section";
import { Eyebrow } from "@/components/marketing/eyebrow";
import { DisplayHeading } from "@/components/marketing/display-heading";
import { PillButton } from "@/components/marketing/pill-button";
import { pillButtonClasses } from "@/components/marketing/pill-button";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/signin");
  }, [loading, user, router]);

  if (loading)
    return (
      <main className="flex min-h-screen items-center justify-center p-8 text-sm text-[var(--color-muted-foreground)]">
        Loading…
      </main>
    );
  if (!user) return null;

  const kycTone =
    user.kycStatus === "Verified"
      ? "text-[var(--color-cane)] border-[var(--color-cane)]"
      : user.kycStatus === "Pending"
        ? "text-[var(--color-primary)] border-[var(--color-primary)]"
        : "text-[var(--color-muted-foreground)] border-[var(--color-border)]";

  const cardClass =
    "bg-white border border-[color:rgba(10,9,8,0.10)] rounded-xl p-8 mb-6";
  const cardHeadingClass =
    "text-[1.25rem] font-[family-name:var(--font-fraunces)] text-[var(--color-foreground)] mb-4";

  return (
    <>
      <SiteHeader />
      <Section tone="cream" size="md">
        <div className="mx-auto w-full max-w-3xl">
          <Eyebrow>your profile</Eyebrow>
          <DisplayHeading level={2} className="mt-4">
            Account
          </DisplayHeading>

          {/* Identity card */}
          <div className={`${cardClass} mt-10 flex flex-col gap-6 sm:flex-row sm:items-center`}>
            <div
              aria-hidden="true"
              className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-[var(--color-sand)] font-[family-name:var(--font-fraunces)] text-3xl tracking-[-0.02em] text-[var(--color-foreground)]"
            >
              {initials(user.displayName)}
            </div>
            <div>
              <h3 className={cardHeadingClass}>
                Welcome, <span className="italic">{user.displayName}</span>
              </h3>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {user.email}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{user.role}</Badge>
                <span
                  className={`inline-flex items-center rounded-full border-[1.5px] px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-[0.14em] ${kycTone}`}
                >
                  {user.kycStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Profile details card */}
          <div className={cardClass}>
            <h3 className={cardHeadingClass}>Profile</h3>
            <dl className="divide-y divide-[color:rgba(10,9,8,0.08)]">
              <DetailRow label="Role" value={user.role} />
              <DetailRow label="KYC status" value={user.kycStatus} />
              <DetailRow label="Language" value={user.preferredLanguage} />
            </dl>
            <div className="mt-8 flex flex-wrap gap-3">
              <PillButton variant="ghost" type="button" disabled>
                Edit
              </PillButton>
              <PillButton
                type="button"
                variant="solid"
                onClick={async () => {
                  await signOut();
                  router.push("/");
                }}
              >
                Sign out
              </PillButton>
            </div>
          </div>

          {/* Host card */}
          {user.role === "Host" && (
            <div className={cardClass}>
              <h3 className={cardHeadingClass}>Hosting on DodoStays</h3>
              <p className="max-w-md text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                Edit, publish and track your places. Add photos, set prices in
                MUR, control your availability.
              </p>
              <div className="mt-6">
                <Link
                  href="/host/listings"
                  className={pillButtonClasses({ variant: "solid" })}
                >
                  Manage my listings
                </Link>
              </div>
            </div>
          )}
        </div>
      </Section>
      <SiteFooter />
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-baseline gap-4 py-4">
      <dt className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
        {label}
      </dt>
      <dd className="text-sm text-[var(--color-foreground)]">{value}</dd>
    </div>
  );
}
