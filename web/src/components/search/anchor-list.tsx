"use client";

import { Box, Chip, Stack, Typography } from "@mui/material";
import AnchorIcon from "@mui/icons-material/Anchor";
import { useRouter, useSearchParams } from "next/navigation";
import { anchorsToString, parseAnchors, MAX_ANCHORS, type Anchor } from "@/lib/anchors";

export function AnchorList() {
  const router = useRouter();
  const sp = useSearchParams();
  const anchors = parseAnchors(sp.get("anchors"));

  function update(next: Anchor[]) {
    const params = new URLSearchParams(sp.toString());
    if (next.length === 0) params.delete("anchors");
    else params.set("anchors", anchorsToString(next));
    router.push(`/listings?${params.toString()}`);
  }

  function rename(i: number) {
    if (typeof window === "undefined") return;
    const current = anchors[i];
    const name = window.prompt("Rename anchor", current.name) ?? current.name;
    update(anchors.map((a, idx) => idx === i ? { ...a, name: name || current.name } : a));
  }

  function remove(i: number) {
    update(anchors.filter((_, idx) => idx !== i));
  }

  if (anchors.length === 0) {
    return (
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="body2"
          sx={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-plex)" }}
        >
          Tap the map to drop an <strong>anchor</strong> — listings will sort by drive-time to the places you care about. Up to {MAX_ANCHORS}.
        </Typography>
      </Box>
    );
  }

  return (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
      {anchors.map((a, i) => (
        <Chip
          key={i}
          icon={<AnchorIcon sx={{ color: "inherit !important" }} />}
          label={a.name}
          color="primary"
          onClick={() => rename(i)}
          onDelete={() => remove(i)}
          sx={{ fontFamily: "var(--font-plex)", boxShadow: "2px 2px 0 var(--color-foreground)" }}
        />
      ))}
    </Stack>
  );
}
