"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, Box, Skeleton, Stack, Typography } from "@mui/material";
import { useAuth } from "@/lib/auth-context";
import { getMyBookings, type BookingSummaryDto } from "@/lib/bookings";
import { BookingCard } from "@/components/bookings/booking-card";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function BookingsPage() {
  const router = useRouter();
  const { user, accessToken, loading } = useAuth();
  const [items, setItems] = useState<BookingSummaryDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/signin?next=/bookings");
  }, [loading, user, router]);

  useEffect(() => {
    if (!accessToken) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(null);
    getMyBookings(accessToken)
      .then(setItems)
      .catch((e) => setError((e as Error).message));
  }, [accessToken]);

  if (loading || !user) return <main className="p-8">Loading…</main>;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <header className="mb-6">
          <h1 className="font-display text-4xl">Your bookings</h1>
          <p className="font-script text-lg text-[var(--ds-ochre,_#D4A24C)]">to bann sezir</p>
        </header>

        {error && <Alert severity="error" sx={{ mb: 2, fontFamily: "var(--font-plex)" }}>{error}</Alert>}

        {items === null && (
          <Stack spacing={2}>
            {[1, 2].map((i) => <Skeleton key={i} variant="rectangular" height={130} sx={{ borderRadius: "12px" }} />)}
          </Stack>
        )}

        {items !== null && items.length === 0 && (
          <Box sx={{ textAlign: "center", py: 6, border: "1.5px dashed var(--color-border)", borderRadius: "12px" }}>
            <Typography sx={{ fontFamily: "var(--font-caveat)", fontSize: "1.5rem", color: "var(--color-muted-foreground)" }}>
              ou pa enkor reserve…
            </Typography>
            <Typography sx={{ mt: 1, fontFamily: "var(--font-plex)", fontSize: "0.875rem", color: "var(--color-muted-foreground)" }}>
              You haven&apos;t booked anything yet.{" "}
              <Link href="/listings" className="underline">Browse stays</Link>
            </Typography>
          </Box>
        )}

        {items !== null && items.length > 0 && (
          <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0, display: "flex", flexDirection: "column", gap: 2 }}>
            {items.map((b) => <BookingCard key={b.id} booking={b} />)}
          </Box>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
