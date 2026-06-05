"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Alert, Box, Button, MenuItem, Select, Snackbar, Stack, Typography } from "@mui/material";
import { useAuth } from "@/lib/auth-context";
import { BookingDatePicker } from "@/components/bookings/booking-date-picker";
import { PriceSummary } from "@/components/bookings/price-summary";
import { HoldCountdown } from "@/components/bookings/hold-countdown";
import { confirmBooking, getAvailability, holdBooking, type HoldBookingResponse } from "@/lib/bookings";

interface Props {
  listingId: string;
  nightlyMur: number;
  cleaningMur: number;
  maxGuests: number;
  minStayNights: number;
}

type State =
  | { kind: "picking" }
  | { kind: "checking" }
  | { kind: "blocked"; reason: string }
  | { kind: "holding" }
  | { kind: "held"; hold: HoldBookingResponse }
  | { kind: "confirming" }
  | { kind: "expired" };

export function BookingSidebar({ listingId, nightlyMur, cleaningMur, maxGuests, minStayNights }: Props) {
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const [state, setState] = useState<State>({ kind: "picking" });
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [numGuests, setNumGuests] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Re-check availability whenever the user changes dates
  useEffect(() => {
    if (!checkIn || !checkOut) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ kind: "checking" });
    getAvailability(listingId, checkIn, checkOut)
      .then((res) => {
        if (cancelled) return;
        if (!res.isAvailable) {
          setState({ kind: "blocked", reason: "Dates already booked. Pick different dates." });
        } else {
          setState({ kind: "picking" });
        }
      })
      .catch((e) => {
        if (cancelled) return;
        setState({ kind: "blocked", reason: (e as Error).message });
      });
    return () => { cancelled = true; };
  }, [listingId, checkIn, checkOut]);

  async function onHoldDates() {
    if (!checkIn || !checkOut || !accessToken) return;
    setError(null);
    setState({ kind: "holding" });
    try {
      const hold = await holdBooking(accessToken, listingId, checkIn, checkOut, numGuests);
      setState({ kind: "held", hold });
    } catch (e) {
      setError((e as Error).message);
      setState({ kind: "picking" });
    }
  }

  async function onConfirm() {
    if (state.kind !== "held" || !accessToken) return;
    setError(null);
    setState({ kind: "confirming" });
    try {
      await confirmBooking(accessToken, state.hold.bookingId);
      router.push("/bookings");
    } catch (e) {
      setError((e as Error).message);
      setState({ kind: "held", hold: state.hold });
    }
  }

  function onExpire() {
    setState({ kind: "expired" });
  }

  function reset() {
    setState({ kind: "picking" });
    setCheckIn(null);
    setCheckOut(null);
  }

  const datesValid = !!(checkIn && checkOut);
  const stateKind = state.kind;

  return (
    <Box
      component="aside"
      sx={{
        position: { lg: "sticky" },
        top: { lg: 24 },
        border: "1.5px solid var(--color-border)",
        borderRadius: "12px",
        p: 3,
        backgroundColor: "var(--color-card)",
        boxShadow: "var(--shadow-card-hover, 0 1px 2px rgba(20,12,8,0.06), 0 4px 16px rgba(20,12,8,0.06))",
      }}
    >
      <Stack spacing={2}>
        <Box>
          <Typography component="span" sx={{ fontFamily: "var(--font-fraunces)", fontSize: "2rem", fontWeight: 600 }}>
            MUR {nightlyMur.toLocaleString()}
          </Typography>
          <Typography component="span" sx={{ fontFamily: "var(--font-plex)", fontSize: "0.875rem", color: "var(--color-muted-foreground)", ml: 1 }}>
            / night
          </Typography>
        </Box>

        {state.kind === "expired" && (
          <Alert severity="warning" variant="outlined" sx={{ fontFamily: "var(--font-plex)" }}>
            Hold expired. Pick dates again to retry.
          </Alert>
        )}

        {(state.kind === "picking" || state.kind === "checking" || state.kind === "blocked" || state.kind === "expired") && (
          <>
            <BookingDatePicker
              initialCheckIn={checkIn}
              initialCheckOut={checkOut}
              minStayNights={minStayNights}
              onChange={({ checkIn, checkOut }) => {
                setCheckIn(checkIn);
                setCheckOut(checkOut);
              }}
            />
            <Box>
              <Typography sx={{ fontFamily: "var(--font-plex)", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--color-muted-foreground)", mb: 0.5 }}>
                Guests
              </Typography>
              <Select
                size="small"
                fullWidth
                value={numGuests}
                onChange={(e) => setNumGuests(Number(e.target.value))}
                sx={{ fontFamily: "var(--font-plex)" }}
              >
                {Array.from({ length: maxGuests }, (_, i) => i + 1).map((n) => (
                  <MenuItem key={n} value={n}>{n} guest{n === 1 ? "" : "s"}</MenuItem>
                ))}
              </Select>
            </Box>
            <PriceSummary
              checkIn={checkIn ? new Date(checkIn) : null}
              checkOut={checkOut ? new Date(checkOut) : null}
              nightlyMur={nightlyMur}
              cleaningMur={cleaningMur}
            />
            {state.kind === "blocked" && (
              <Alert severity="info" variant="outlined" sx={{ fontFamily: "var(--font-plex)" }}>{state.reason}</Alert>
            )}
            {!user ? (
              <Button
                component={Link}
                href={`/signin?next=/listings/${listingId}`}
                variant="contained"
                color="primary"
                size="large"
                fullWidth
              >
                Sign in to book
              </Button>
            ) : (
              <Button
                onClick={onHoldDates}
                disabled={!datesValid || stateKind === "checking" || stateKind === "blocked" || stateKind === "holding"}
                variant="contained"
                color="primary"
                size="large"
                fullWidth
              >
                {stateKind === "holding" ? "Holding…" : "Hold dates"}
              </Button>
            )}
          </>
        )}

        {state.kind === "held" && (
          <>
            <PriceSummary
              checkIn={state.hold.dates.checkIn ? new Date(state.hold.dates.checkIn) : null}
              checkOut={state.hold.dates.checkOut ? new Date(state.hold.dates.checkOut) : null}
              nightlyMur={state.hold.nightlyRateMur}
              cleaningMur={state.hold.cleaningFeeMur}
            />
            <HoldCountdown expiresAt={state.hold.holdExpiresAt} onExpire={onExpire} />
            <Button onClick={onConfirm} variant="contained" color="primary" size="large" fullWidth>
              Confirm booking
            </Button>
            <Button onClick={reset} variant="text" size="small" color="secondary">
              Pick different dates
            </Button>
            <Typography sx={{ fontFamily: "var(--font-plex)", fontSize: "0.75rem", color: "var(--color-muted-foreground)", textAlign: "center" }}>
              Payment will be wired in Plan 04. For now, &quot;Confirm&quot; finalizes without charging.
            </Typography>
          </>
        )}

        {state.kind === "confirming" && (
          <Alert severity="info" variant="outlined" sx={{ fontFamily: "var(--font-plex)" }}>
            Confirming booking…
          </Alert>
        )}
      </Stack>

      <Snackbar
        open={error !== null}
        autoHideDuration={5000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="error" onClose={() => setError(null)} sx={{ fontFamily: "var(--font-plex)" }}>
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}
