"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlagDivider } from "@/components/decorations/flag-divider";

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
        ? "text-[var(--color-ochre)] border-[var(--color-ochre)]"
        : "text-[var(--color-muted-foreground)] border-[var(--color-border)]";

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-16 sm:px-10 sm:py-24">
        <p className="font-script text-2xl text-[var(--color-ochre)]">
          ou kont
        </p>
        <FlagDivider width="short" className="mt-2" />
        <div className="mt-12 grid gap-16 lg:grid-cols-[1fr_1.4fr]">
          {/* Left: identity */}
          <div className="flex flex-col items-start">
            <div
              aria-hidden="true"
              className="flex h-28 w-28 items-center justify-center rounded-[2px] border-[1.5px] border-[var(--color-ochre)] bg-[var(--color-sand)] font-display text-4xl tracking-[-0.02em] text-[var(--color-foreground)]"
            >
              {initials(user.displayName)}
            </div>
            <h1 className="mt-8 font-display text-4xl leading-[1.05] tracking-[-0.02em] sm:text-5xl">
              Welcome,{" "}
              <span className="italic">{user.displayName}</span>.
            </h1>
            <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">
              {user.email}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{user.role}</Badge>
              <span
                className={`inline-flex items-center border-[1.5px] px-2.5 font-script text-base ${kycTone}`}
              >
                {user.kycStatus.toLowerCase()}
              </span>
            </div>
          </div>

          {/* Right: details + actions */}
          <div>
            <p className="font-script text-2xl text-[var(--color-ochre)]">
              profile
            </p>
            <dl className="mt-3 divide-y-[1.5px] divide-[var(--color-border)] border-y-[1.5px] border-[var(--color-ochre)]">
              <DetailRow label="Role" value={user.role} />
              <DetailRow label="KYC status" value={user.kycStatus} />
              <DetailRow label="Language" value={user.preferredLanguage} />
            </dl>

            <div className="mt-12 flex flex-wrap gap-3">
              {user.role === "Host" && (
                <Link href="/host/listings">
                  <Button className="shadow-block">Manage my listings</Button>
                </Link>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  await signOut();
                  router.push("/");
                }}
              >
                Sign out
              </Button>
            </div>

            {user.role === "Host" && (
              <div className="mt-16 border-t-[1.5px] border-[var(--color-border)] pt-10">
                <p className="font-script text-2xl text-[var(--color-ochre)]">
                  for hosts
                </p>
                <h2 className="mt-1 font-display text-2xl tracking-[-0.01em]">
                  Hosting on DodoStays.
                </h2>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                  Edit, publish and track your places. Add photos, set
                  prices in MUR, control your availability.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-baseline gap-4 py-4">
      <dt className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--color-ochre)]">
        {label}
      </dt>
      <dd className="text-sm text-[var(--color-foreground)]">{value}</dd>
    </div>
  );
}
