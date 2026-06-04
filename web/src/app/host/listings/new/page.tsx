"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { createListing } from "@/lib/listings";
import { ListingForm } from "../listing-form";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

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
      <main className="mx-auto max-w-5xl px-6 py-16 sm:px-10 sm:py-20">
        <Link
          href="/host/listings"
          className="text-sm text-[var(--color-muted-foreground)] transition-colors duration-200 ease-out hover:text-[var(--color-accent)]"
        >
          &larr; Back to my listings
        </Link>
        <div className="mt-10 max-w-3xl border-b border-[var(--color-border)] pb-10">
          <p className="small-caps text-xs text-[var(--color-muted-foreground)]">
            New listing
          </p>
          <h1 className="mt-4 font-display text-5xl leading-[1.05] tracking-[-0.02em] sm:text-6xl">
            Tell us about your place.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--color-muted-foreground)]">
            Fill in the basics now. You can add photos and publish from the
            next screen.
          </p>
        </div>

        <div className="mt-14">
          <ListingForm
            submitLabel="Save as draft"
            onSubmit={async (input) => {
              if (!accessToken) throw new Error("Not authenticated");
              const created = await createListing(accessToken, input);
              router.push(`/host/listings/${created.id}/edit`);
            }}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
