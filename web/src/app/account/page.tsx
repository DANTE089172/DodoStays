"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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

  const kycVariant: "success" | "muted" | "accent" =
    user.kycStatus === "Verified" ? "success" : user.kycStatus === "Pending" ? "accent" : "muted";

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-16 sm:px-10 sm:py-24">
        <p className="small-caps text-xs text-[var(--color-muted-foreground)]">
          Account
        </p>
        <div className="mt-12 grid gap-16 lg:grid-cols-[1fr_1.4fr]">
          {/* Left: identity */}
          <div className="flex flex-col items-start">
            <div
              aria-hidden="true"
              className="flex h-28 w-28 items-center justify-center rounded-full bg-[var(--color-muted)] font-display text-4xl tracking-[-0.02em] text-[var(--color-foreground)]"
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
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge variant="outline">{user.role}</Badge>
              <Badge variant={kycVariant}>KYC: {user.kycStatus}</Badge>
            </div>
          </div>

          {/* Right: details + actions */}
          <div>
            <p className="small-caps text-xs text-[var(--color-muted-foreground)]">
              Profile
            </p>
            <dl className="mt-5 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
              <DetailRow label="Role" value={user.role} />
              <DetailRow label="KYC status" value={user.kycStatus} />
              <DetailRow label="Language" value={user.preferredLanguage} />
            </dl>

            <div className="mt-12 flex flex-wrap gap-3">
              {user.role === "Host" && (
                <Link href="/host/listings">
                  <Button>Manage my listings</Button>
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
              <div className="mt-16 border-t border-[var(--color-border)] pt-10">
                <p className="small-caps text-xs text-[var(--color-muted-foreground)]">
                  For hosts
                </p>
                <h2 className="mt-3 font-display text-2xl tracking-[-0.01em]">
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
      <dt className="small-caps text-xs text-[var(--color-muted-foreground)]">
        {label}
      </dt>
      <dd className="text-sm text-[var(--color-foreground)]">{value}</dd>
    </div>
  );
}
