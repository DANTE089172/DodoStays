"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { createListing } from "@/lib/listings";
import { ListingForm } from "../listing-form";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Section } from "@/components/marketing/section";
import { Eyebrow } from "@/components/marketing/eyebrow";
import { DisplayHeading } from "@/components/marketing/display-heading";
import { Lede } from "@/components/marketing/lede";

export default function NewListingPage() {
  const router = useRouter();
  const { user, accessToken, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/signin");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8 text-sm text-[var(--color-muted-foreground)]">
        Loading…
      </main>
    );
  }

  return (
    <>
      <SiteHeader />

      <Section tone="cream" size="sm">
        <Link
          href="/host/listings"
          className="text-sm text-[var(--color-muted-foreground)] transition-colors duration-200 ease-out hover:text-[var(--color-foreground)]"
        >
          &larr; Back to my listings
        </Link>
        <div className="mt-6 max-w-2xl">
          <Eyebrow>New listing</Eyebrow>
          <DisplayHeading level={2} className="mt-3">
            Tell us about your place.
          </DisplayHeading>
          <Lede className="mt-4">
            Fill in the basics now. You can add photos and publish from the
            next screen.
          </Lede>
        </div>
      </Section>

      <main className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-10 sm:py-14">
        <ListingForm
          submitLabel="Save as draft"
          onSubmit={async (input) => {
            if (!accessToken) throw new Error("Not authenticated");
            const created = await createListing(accessToken, input);
            router.push(`/host/listings/${created.id}/edit`);
          }}
        />
      </main>
      <SiteFooter />
    </>
  );
}
