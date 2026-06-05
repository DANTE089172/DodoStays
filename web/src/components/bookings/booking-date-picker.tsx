"use client";

import { useState } from "react";
import { Box } from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFnsV3";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { isAfter, isBefore, today, toIsoDate } from "@/lib/dates";

interface Props {
  initialCheckIn?: string | null;
  initialCheckOut?: string | null;
  minStayNights?: number;
  onChange: (range: { checkIn: string | null; checkOut: string | null }) => void;
}

export function BookingDatePicker({ initialCheckIn = null, initialCheckOut = null, minStayNights = 1, onChange }: Props) {
  const [checkIn, setCheckIn] = useState<Date | null>(initialCheckIn ? new Date(initialCheckIn) : null);
  const [checkOut, setCheckOut] = useState<Date | null>(initialCheckOut ? new Date(initialCheckOut) : null);

  function update(next: { checkIn: Date | null; checkOut: Date | null }) {
    setCheckIn(next.checkIn);
    setCheckOut(next.checkOut);
    onChange({
      checkIn: next.checkIn ? toIsoDate(next.checkIn) : null,
      checkOut: next.checkOut ? toIsoDate(next.checkOut) : null,
    });
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
        <DatePicker
          label="Check in"
          value={checkIn}
          minDate={today()}
          maxDate={checkOut ?? undefined}
          onChange={(d) => {
            // If user moves check-in past existing check-out, clear check-out
            const nextCheckOut = d && checkOut && !isBefore(d, checkOut) ? null : checkOut;
            update({ checkIn: d, checkOut: nextCheckOut });
          }}
          slotProps={{
            textField: {
              size: "small",
              fullWidth: true,
              sx: { fontFamily: "var(--font-plex)" },
            },
          }}
        />
        <DatePicker
          label="Check out"
          value={checkOut}
          minDate={checkIn ? new Date(checkIn.getTime() + minStayNights * 24 * 60 * 60 * 1000) : today()}
          onChange={(d) => {
            // If user picks check-out before check-in, swap
            if (d && checkIn && isAfter(checkIn, d)) {
              update({ checkIn: d, checkOut: checkIn });
            } else {
              update({ checkIn, checkOut: d });
            }
          }}
          slotProps={{
            textField: {
              size: "small",
              fullWidth: true,
              sx: { fontFamily: "var(--font-plex)" },
            },
          }}
        />
      </Box>
    </LocalizationProvider>
  );
}
