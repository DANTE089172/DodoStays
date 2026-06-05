"use client";

import { Box, Divider, Stack, Typography } from "@mui/material";
import { nightsBetween } from "@/lib/dates";

interface Props {
  checkIn: Date | null;
  checkOut: Date | null;
  nightlyMur: number;
  cleaningMur: number;
}

const VAT_RATE = 0.15;

export function PriceSummary({ checkIn, checkOut, nightlyMur, cleaningMur }: Props) {
  if (!checkIn || !checkOut) {
    return (
      <Box sx={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-plex)", fontSize: "0.875rem", py: 1 }}>
        Pick check-in and check-out dates to see total.
      </Box>
    );
  }

  const nights = nightsBetween(checkIn, checkOut);
  if (nights <= 0) return null;

  const nightlySubtotal = nightlyMur * nights;
  const subtotal = nightlySubtotal + cleaningMur;
  const vat = Math.round(subtotal * VAT_RATE * 100) / 100;
  const total = subtotal + vat;

  return (
    <Stack spacing={1} sx={{ py: 1, fontFamily: "var(--font-plex)", fontSize: "0.875rem" }}>
      <Row label={`MUR ${nightlyMur.toLocaleString()} × ${nights} night${nights === 1 ? "" : "s"}`} value={`MUR ${nightlySubtotal.toLocaleString()}`} />
      {cleaningMur > 0 && <Row label="Cleaning fee" value={`MUR ${cleaningMur.toLocaleString()}`} />}
      <Row label="VAT (15%)" value={`MUR ${vat.toLocaleString()}`} />
      <Divider sx={{ borderColor: "var(--color-border)" }} />
      <Row label="Total" value={`MUR ${total.toLocaleString()}`} bold />
    </Stack>
  );
}

function Row({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
      <Typography sx={{ fontFamily: "inherit", fontSize: "inherit", fontWeight: bold ? 600 : 400 }}>{label}</Typography>
      <Typography sx={{ fontFamily: "inherit", fontSize: "inherit", fontWeight: bold ? 600 : 400 }}>{value}</Typography>
    </Box>
  );
}
