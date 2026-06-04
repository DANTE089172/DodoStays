"use client";

import { FormControlLabel, Switch } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";

export function SearchAsIMoveToggle() {
  const router = useRouter();
  const sp = useSearchParams();
  const enabled = sp.get("liveSearch") !== "off";

  function toggle() {
    const next = new URLSearchParams(sp.toString());
    if (enabled) next.set("liveSearch", "off");
    else next.delete("liveSearch");
    router.push(`/listings?${next.toString()}`);
  }

  return (
    <FormControlLabel
      control={<Switch checked={enabled} onChange={toggle} size="small" color="primary" />}
      label={<span style={{ fontFamily: "var(--font-plex)", fontSize: "0.875rem", color: "var(--color-muted-foreground)" }}>Search as I move</span>}
    />
  );
}
