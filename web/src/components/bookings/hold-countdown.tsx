"use client";

import { useEffect, useState } from "react";
import { Box, LinearProgress, Typography } from "@mui/material";
import { timeUntil } from "@/lib/dates";

interface Props {
  expiresAt: string;          // ISO timestamp
  totalMs?: number;           // for progress bar; default 15 minutes
  onExpire?: () => void;
}

export function HoldCountdown({ expiresAt, totalMs = 15 * 60 * 1000, onExpire }: Props) {
  const [{ ms, label }, setState] = useState(() => timeUntil(expiresAt));

  useEffect(() => {
    const interval = setInterval(() => {
      const next = timeUntil(expiresAt);
      setState(next);
      if (next.ms <= 0 && onExpire) onExpire();
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const expired = ms <= 0;
  const percent = expired ? 0 : Math.max(0, Math.min(100, (ms / totalMs) * 100));

  return (
    <Box
      sx={{
        border: "1.5px solid var(--color-border)",
        borderRadius: "6px",
        p: 1.5,
        backgroundColor: "var(--color-card)",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography sx={{ fontFamily: "var(--font-plex)", fontSize: "0.8rem", letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--color-muted-foreground)" }}>
          {expired ? "Hold expired" : "Hold expires in"}
        </Typography>
        <Typography sx={{ fontFamily: "var(--font-plex)", fontSize: "1rem", fontWeight: 600, color: expired ? "var(--color-destructive)" : "var(--color-foreground)" }}>
          {expired ? "—" : label}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={percent}
        sx={{
          height: 4,
          borderRadius: 2,
          backgroundColor: "var(--color-muted)",
          "& .MuiLinearProgress-bar": {
            backgroundColor: expired ? "var(--color-destructive)" : "var(--color-accent)",
          },
        }}
      />
    </Box>
  );
}
