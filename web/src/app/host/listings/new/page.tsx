"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { createListing } from "@/lib/listings";
import { ListingForm } from "../listing-form";

export default function NewListingPage() {
  const router = useRouter();
  const { user, accessToken, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) router.replace("/signin");
  }, [loading, user, router]);

  if (loading || !user) return <main className="p-8">Loading…</main>;

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-4">
        <Link href="/host/listings" className="text-sm underline">← Back to my listings</Link>
      </div>
      <h1 className="mb-6 text-3xl font-bold">New listing</h1>
      <ListingForm
        submitLabel="Save as draft"
        onSubmit={async (input) => {
          if (!accessToken) throw new Error("Not authenticated");
          const created = await createListing(accessToken, input);
          router.push(`/host/listings/${created.id}/edit`);
        }}
      />
    </main>
  );
}
