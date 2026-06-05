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
          borderRadius: "6px",
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
    <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0, display: "flex", flexDirection: "column", gap: 2.5 }}>
      {items.map((l) => {
        const highlighted = highlightId === l.id;
        return (
          <Box
            key={l.id}
            component="li"
            onMouseEnter={() => onCardHover(l.id)}
            onMouseLeave={() => onCardHover(null)}
            sx={{
              borderRadius: "var(--radius-card, 12px)",
              transition: "box-shadow 200ms ease-out, outline-color 200ms ease-out",
              outline: highlighted ? "2px solid var(--color-foreground)" : "2px solid transparent",
              outlineOffset: 2,
              "&:hover": {
                boxShadow: "var(--shadow-card-hover)",
              },
              "&:hover .ds-card-photo img": {
                opacity: 0.95,
                filter: "contrast(1.05) saturate(1.08)",
              },
              "&:hover .ds-card-title": {
                textDecoration: "underline",
              },
            }}
          >
            <Link href={`/listings/${l.id}`} style={{ display: "flex", gap: 14, textDecoration: "none", color: "inherit" }}>
              <Box
                className="ds-card-photo"
                sx={{
                  flexShrink: 0,
                  width: 180,
                  aspectRatio: "4/3",
                  backgroundColor: "var(--color-muted)",
                  overflow: "hidden",
                  borderRadius: "var(--radius-card, 12px)",
                }}
              >
                {l.primaryPhotoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={l.primaryPhotoUrl}
                    alt={l.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      opacity: 1,
                      transition: "opacity 200ms ease-out, filter 200ms ease-out",
                    }}
                  />
                )}
              </Box>
              <Box sx={{ minWidth: 0, flex: 1, py: 0.5 }}>
                <Typography
                  component="h3"
                  className="ds-card-title"
                  sx={{
                    fontFamily: "var(--font-fraunces)",
                    fontWeight: 600,
                    fontSize: "1.125rem",
                    lineHeight: 1.25,
                  }}
                >
                  {l.title}
                </Typography>
                <Typography sx={{ fontFamily: "var(--font-caveat)", fontSize: "0.85rem", color: "var(--ds-ochre, #D4A24C)" }}>
                  {l.region.replace(/-/g, " ")}
                </Typography>
                <Typography sx={{ mt: 0.5, fontFamily: "var(--font-plex)", fontSize: "0.9rem", fontWeight: 600 }}>
                  MUR {l.nightlyRateMur.toLocaleString()}
                  <Box component="span" sx={{ fontWeight: 400, color: "var(--color-muted-foreground)" }}>{" "}/ night</Box>
                </Typography>
                {l.driveTimeMinutes !== null && (
                  <Typography
                    sx={{
                      mt: 0.5,
                      display: "inline-flex",
                      alignItems: "center",
                      fontFamily: "var(--font-plex)",
                      fontSize: "0.75rem",
                      color: "var(--color-muted-foreground)",
                    }}
                  >
                    <Box
                      component="span"
                      aria-hidden
                      sx={{
                        display: "inline-block",
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        // Drive-time is anchor-related wayfinding, so it
                        // tracks the cobalt-secondary anchor-pin color
                        // rather than the flamboyant status-stamp accent.
                        backgroundColor: "var(--color-secondary)",
                        mr: 0.75,
                      }}
                    />
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
