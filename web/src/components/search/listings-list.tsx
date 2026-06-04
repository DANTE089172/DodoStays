"use client";

import Link from "next/link";
import { Box, Typography } from "@mui/material";
import type { ListingSummary } from "@/lib/listings";

interface Props {
  items: ListingSummary[];
  highlightId: string | null;
  onCardHover: (id: string | null) => void;
}

export function ListingsList({ items, highlightId, onCardHover }: Props) {
  if (items.length === 0) {
    return (
      <Box
        sx={{
          border: "1.5px dashed var(--color-border)",
          borderRadius: "2px",
          p: 5,
          textAlign: "center",
        }}
      >
        <Typography sx={{ fontFamily: "var(--font-caveat)", fontSize: "1.5rem", color: "var(--color-muted-foreground)" }}>
          pa enkor de listings…
        </Typography>
        <Typography sx={{ mt: 1, fontFamily: "var(--font-plex)", fontSize: "0.875rem", color: "var(--color-muted-foreground)" }}>
          No listings match your filters. Try removing a chip, dropping an anchor, or panning the map.
        </Typography>
      </Box>
    );
  }

  return (
    <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0, display: "flex", flexDirection: "column", gap: 2 }}>
      {items.map((l) => {
        const highlighted = highlightId === l.id;
        return (
          <Box
            key={l.id}
            component="li"
            onMouseEnter={() => onCardHover(l.id)}
            onMouseLeave={() => onCardHover(null)}
            sx={{
              transition: "outline 200ms ease-out",
              outline: highlighted ? "2px solid var(--color-foreground)" : "none",
              outlineOffset: highlighted ? 0 : 0,
            }}
          >
            <Link href={`/listings/${l.id}`} style={{ display: "flex", gap: 12, textDecoration: "none", color: "inherit" }}>
              <Box
                sx={{
                  flexShrink: 0,
                  width: 160,
                  aspectRatio: "4/3",
                  border: "1.5px solid var(--color-border)",
                  backgroundColor: "var(--color-muted)",
                  overflow: "hidden",
                  borderRadius: "2px",
                }}
              >
                {l.primaryPhotoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.primaryPhotoUrl} alt={l.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )}
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography component="h3" sx={{ fontFamily: "var(--font-fraunces)", fontWeight: 600, fontSize: "1.125rem", lineHeight: 1.3, '&:hover': { textDecoration: 'underline' } }}>
                  {l.title}
                </Typography>
                <Typography sx={{ fontFamily: "var(--font-caveat)", fontSize: "0.95rem", color: "var(--ds-ochre, #D4A24C)" }}>
                  {l.region.replace(/-/g, " ")}
                </Typography>
                <Typography sx={{ mt: 0.5, fontFamily: "var(--font-plex)", fontSize: "0.875rem", fontWeight: 600 }}>
                  MUR {l.nightlyRateMur.toLocaleString()}
                  <Box component="span" sx={{ fontWeight: 400, color: "var(--color-muted-foreground)" }}>{" "}/ night</Box>
                </Typography>
                {l.driveTimeMinutes !== null && (
                  <Typography sx={{ mt: 0.5, fontFamily: "var(--font-plex)", fontSize: "0.75rem", color: "var(--color-muted-foreground)" }}>
                    ~{l.driveTimeMinutes} min from your anchor
                  </Typography>
                )}
              </Box>
            </Link>
          </Box>
        );
      })}
    </Box>
  );
}
