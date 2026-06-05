"use client";

import Link from "next/link";
import { Box, Chip, Stack, Typography } from "@mui/material";
import type { BookingState, BookingSummaryDto } from "@/lib/bookings";
import { formatDate, fromIsoDate } from "@/lib/dates";

interface Props {
  booking: BookingSummaryDto;
}

const STATE_COLOR: Record<BookingState, "default" | "primary" | "success" | "warning" | "error" | "info"> = {
  PendingPayment: "warning",
  Confirmed: "primary",
  CheckedIn: "info",
  Completed: "success",
  Cancelled: "error",
  Disputed: "error",
};

const STATE_LABEL: Record<BookingState, string> = {
  PendingPayment: "Pending payment",
  Confirmed: "Confirmed",
  CheckedIn: "Checked in",
  Completed: "Completed",
  Cancelled: "Cancelled",
  Disputed: "Disputed",
};

export function BookingCard({ booking }: Props) {
  const checkIn = fromIsoDate(booking.dates.checkIn);
  const checkOut = fromIsoDate(booking.dates.checkOut);

  return (
    <Box
      component="li"
      sx={{
        display: "flex",
        gap: 2,
        p: 2,
        border: "1.5px solid var(--color-border)",
        borderRadius: "12px",
        backgroundColor: "var(--color-card)",
        "&:hover": { boxShadow: "var(--shadow-card-hover, 0 1px 2px rgba(20,12,8,0.06), 0 4px 16px rgba(20,12,8,0.06))" },
        transition: "box-shadow 200ms ease-out",
      }}
    >
      <Box sx={{ width: 140, aspectRatio: "4/3", borderRadius: "8px", overflow: "hidden", flexShrink: 0, backgroundColor: "var(--color-muted)" }}>
        {booking.primaryPhotoUrl && (
          <img src={booking.primaryPhotoUrl} alt={booking.listingTitle} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}
      </Box>
      <Stack sx={{ flex: 1, minWidth: 0 }} spacing={0.5}>
        <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
          <Link href={`/listings/${booking.listingId}`} style={{ textDecoration: "none", color: "inherit", flex: 1 }}>
            <Typography component="h3" sx={{ fontFamily: "var(--font-fraunces)", fontWeight: 600, fontSize: "1.125rem", lineHeight: 1.25, "&:hover": { textDecoration: "underline" } }}>
              {booking.listingTitle}
            </Typography>
          </Link>
          <Chip label={STATE_LABEL[booking.state]} color={STATE_COLOR[booking.state]} size="small" />
        </Box>
        <Typography sx={{ fontFamily: "var(--font-plex)", fontSize: "0.875rem", color: "var(--color-muted-foreground)" }}>
          {formatDate(checkIn)} → {formatDate(checkOut)}
        </Typography>
        <Typography sx={{ fontFamily: "var(--font-plex)", fontSize: "0.875rem", fontWeight: 600 }}>
          MUR {booking.totalMur.toLocaleString()}
        </Typography>
      </Stack>
    </Box>
  );
}
