"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { createListing } from "@/lib/listings";
import { ListingForm } from "../listing-form";
import { SiteHeader } from "@/components/site-header";
import { Card, CardContent } from "@/components/ui/card";

export default function NewListingPage() {
  const router = useRouter();
  const { user, accessToken, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/signin");
  }, [loading, user, router]);

  if (loading || !user)
    return (
      <main className="flex min-h-screen items-center justify-center p-8 text-sm text-[var(--color-muted-foreground)]">
        Loading…
      </main>
    );

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="mb-6">
          <Link
            href="/host/listings"
            className="inline-flex items-center gap-1 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)]"
          >
            <span aria-hidden="true">←</span> Back to my listings
          </Link>
        </div>
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-primary)]">
            New listing
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Tell us about your place
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--color-muted-foreground)]">
            Fill in the basics now. You can add photos and publish from the next screen.
          </p>
        </div>

        <Card>
          <CardContent className="p-6 sm:p-8">
            <ListingForm
              submitLabel="Save as draft"
              onSubmit={async (input) => {
                if (!accessToken) throw new Error("Not authenticated");
                const created = await createListing(accessToken, input);
                router.push(`/host/listings/${created.id}/edit`);
              }}
            />
          </CardContent>
        </Card>
      </main>
    </>
  );
}
