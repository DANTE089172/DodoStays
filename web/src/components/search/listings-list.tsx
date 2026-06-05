"use client";

import Link from "next/link";
import { Box, Typography } from "@mui/material";
import type { ListingSummary } from "@/lib/listings";
import { Eyebrow } from "@/components/marketing/eyebrow";

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
          border: "1px dashed color-mix(in srgb, var(--color-foreground) 20%, transparent)",
          borderRadius: "4px",
          p: 6,
          textAlign: "center",
          backgroundColor: "var(--color-card)",
        }}
      >
        <Typography
          sx={{
            fontFamily: "var(--font-fraunces)",
            fontSize: "1.5rem",
            color: "var(--color-foreground)",
            fontWeight: 600,
            letterSpacing: "-0.01em",
          }}
        >
          No stays match these filters.
        </Typography>
        <Typography
          sx={{
            mt: 1.5,
            fontFamily: "var(--font-plex)",
            fontSize: "0.9rem",
            color: "var(--color-muted-foreground)",
            lineHeight: 1.6,
          }}
        >
          Try removing a chip, dropping an anchor, or panning the map.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      component="ul"
      sx={{
        listStyle: "none",
        p: 0,
        m: 0,
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
        gap: 3,
      }}
    >
      {items.map((l) => {
        const highlighted = highlightId === l.id;
        return (
          <Box
            key={l.id}
            component="li"
            onMouseEnter={() => onCardHover(l.id)}
            onMouseLeave={() => onCardHover(null)}
            sx={{
              borderRadius: "4px",
              border: "1px solid color-mix(in srgb, var(--color-foreground) 10%, transparent)",
              overflow: "hidden",
              transition: "border-color 200ms ease-out",
              outline: highlighted ? "1px solid var(--color-primary)" : "1px solid transparent",
              outlineOffset: 0,
              backgroundColor: "var(--color-card)",
              "&:hover .ds-card-photo img": {
                transform: "scale(1.02)",
              },
            }}
          >
            <Link
              href={`/listings/${l.id}`}
              style={{ display: "block", textDecoration: "none", color: "inherit" }}
            >
              <Box
                className="ds-card-photo"
                sx={{
                  width: "100%",
                  aspectRatio: "4 / 5",
                  backgroundColor: "var(--color-muted)",
                  overflow: "hidden",
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
                      transition: "transform 400ms ease-out",
                    }}
                  />
                )}
              </Box>
              <Box sx={{ p: 2.5 }}>
                <Eyebrow tone="muted">
                  {l.region.replace(/-/g, " ")} · {l.vibe}
                </Eyebrow>
                <Typography
                  component="h3"
                  className="ds-card-title"
                  sx={{
                    mt: 1.5,
                    fontFamily: "var(--font-fraunces)",
                    fontWeight: 600,
                    fontSize: "1.375rem",
                    lineHeight: 1.2,
                    letterSpacing: "-0.01em",
                    color: "var(--color-foreground)",
                  }}
                >
                  {l.title}
                </Typography>
                <Typography
                  sx={{
                    mt: 1.5,
                    fontFamily: "var(--font-plex)",
                    fontSize: "0.875rem",
                    color: "var(--color-muted-foreground)",
                  }}
                >
                  <Box
                    component="span"
                    sx={{ color: "var(--color-foreground)", fontWeight: 600 }}
                  >
                    MUR {l.nightlyRateMur.toLocaleString()}
                  </Box>
                  {" · per night"}
                </Typography>
                {l.driveTimeMinutes !== null && (
                  <Typography
                    sx={{
                      mt: 1,
                      display: "inline-flex",
                      alignItems: "center",
                      fontFamily: "var(--font-plex)",
                      fontSize: "0.75rem",
                      color: "var(--color-muted-foreground)",
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                    }}
                  >
                    <Box
                      component="span"
                      aria-hidden
                      sx={{
                        display: "inline-block",
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        // Drive-time tracks the cobalt anchor-pin colour.
                        backgroundColor: "var(--color-secondary)",
                        mr: 1,
                      }}
                    />
                    {l.driveTimeMinutes} min from anchor
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
