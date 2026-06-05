"use client";

import { useEffect, useState } from "react";
import { Alert, Stack, TextField } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useAuth } from "@/lib/auth-context";
import { getMyIcalUrl } from "@/lib/ical";
import { Eyebrow } from "@/components/marketing/eyebrow";
import { PillButton } from "@/components/marketing/pill-button";

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
    <div className="rounded-xl border-[1.5px] border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_8%,var(--color-card))] p-5">
      <Eyebrow>DodoStays feed</Eyebrow>
      <h3 className="mt-2 font-[var(--font-display)] text-xl font-semibold leading-tight">
        Your DodoStays iCal URL
      </h3>
      <p className="mt-2 mb-4 text-sm text-[var(--color-muted-foreground)]">
        Copy this URL and paste it into Airbnb / Booking.com&apos;s &quot;Import calendar&quot; setting so they block these dates too.
      </p>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {url && (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField
            size="small"
            fullWidth
            value={url}
            InputProps={{ readOnly: true }}
            sx={{ "& .MuiInputBase-root": { backgroundColor: "var(--color-card)" } }}
          />
          <PillButton variant="solid" size="sm" onClick={copy}>
            <ContentCopyIcon sx={{ fontSize: 16 }} />
            {copied ? "Copied" : "Copy"}
          </PillButton>
        </Stack>
      )}
    </div>
  );
}
