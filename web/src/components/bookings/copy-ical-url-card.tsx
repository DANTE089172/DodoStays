"use client";

import { useEffect, useState } from "react";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useAuth } from "@/lib/auth-context";
import { getMyIcalUrl } from "@/lib/ical";

interface Props { listingId: string; }

export function CopyIcalUrlCard({ listingId }: Props) {
  const { accessToken } = useAuth();
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;
    getMyIcalUrl(accessToken, listingId).then(({ url }) => setUrl(url)).catch((e) => setError((e as Error).message));
  }, [accessToken, listingId]);

  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Box sx={{ p: 2, border: "1.5px solid var(--color-border)", borderRadius: "8px", backgroundColor: "var(--color-card)" }}>
      <Typography sx={{ fontFamily: "var(--font-fraunces)", fontWeight: 600, fontSize: "1rem", mb: 0.5 }}>
        Your DodoStays iCal URL
      </Typography>
      <Typography sx={{ fontFamily: "var(--font-plex)", fontSize: "0.875rem", color: "var(--color-muted-foreground)", mb: 2 }}>
        Copy this URL and paste it into Airbnb / Booking.com&apos;s &quot;Import calendar&quot; setting so they block these dates too.
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {url && (
        <Stack direction="row" spacing={1}>
          <TextField size="small" fullWidth value={url} InputProps={{ readOnly: true }} />
          <Button startIcon={<ContentCopyIcon />} variant="outlined" onClick={copy}>
            {copied ? "Copied" : "Copy"}
          </Button>
        </Stack>
      )}
    </Box>
  );
}
