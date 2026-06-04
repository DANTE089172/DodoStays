"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

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
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <Card>
          <CardHeader className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div
              aria-hidden="true"
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-xl font-semibold text-[var(--color-primary-foreground)] shadow-sm"
            >
              {initials(user.displayName)}
            </div>
            <div className="flex-1">
              <CardTitle className="text-2xl">Welcome, {user.displayName}</CardTitle>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{user.email}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="secondary">{user.role}</Badge>
                <Badge variant={kycVariant}>KYC: {user.kycStatus}</Badge>
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                Role
              </p>
              <p className="mt-1 text-sm">{user.role}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                KYC status
              </p>
              <p className="mt-1 text-sm">{user.kycStatus}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
                Language
              </p>
              <p className="mt-1 text-sm">{user.preferredLanguage}</p>
            </div>
          </CardContent>
        </Card>

        {user.role === "Host" && (
          <Card className="mt-6">
            <CardContent className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">Hosting on DodoStays</p>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  Edit, publish and track your places.
                </p>
              </div>
              <Link href="/host/listings">
                <Button>Manage my listings</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <div className="mt-8 flex justify-end">
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
      </main>
    </>
  );
}
