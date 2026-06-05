"use client";

import { IconButton, Tooltip } from "@mui/material";

interface Props {
  onTranscript?: (text: string) => void;
  size?: "medium" | "large";
}

// Placeholder for Plan 02c: real Web Speech API integration lands then.
// For now we render a styled, tooltipped, disabled-feel mic with a CSS-only
// 3-bar waveform — the cinematic "talk to me" cue lives entirely in CSS so
// it works before any speech wiring exists.
export function VoiceButton({ size = "large" }: Props) {
  const dim = size === "large" ? 56 : 44;
  return (
    <Tooltip title="Voice search — coming soon">
      <span>
        <IconButton
          aria-label="Voice search (coming soon)"
          disabled
          sx={{
            width: dim,
            height: dim,
            borderRadius: "6px",
            border: "1.5px solid var(--color-border)",
            backgroundColor: "var(--color-card)",
            // Voice button is a brand element (not a status stamp), so it
            // takes the new peach primary rather than the flamboyant accent.
            color: "var(--color-primary)",
            "&:hover": { backgroundColor: "var(--color-muted)" },
            "&.Mui-disabled": {
              color: "var(--color-primary)",
              border: "1.5px solid var(--color-border)",
              backgroundColor: "var(--color-card)",
            },
          }}
        >
          <span className="ds-waveform" aria-hidden>
            <span />
            <span />
            <span />
          </span>
        </IconButton>
      </span>
    </Tooltip>
  );
}
