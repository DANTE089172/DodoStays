"use client";

import { IconButton, Tooltip } from "@mui/material";
import MicNoneIcon from "@mui/icons-material/MicNone";

interface Props {
  onTranscript?: (text: string) => void;
  size?: "medium" | "large";
}

// Placeholder for Plan 02c: real Web Speech API integration lands then.
// For now we render a styled, tooltipped, disabled-feel mic that doesn't fire.
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
            borderRadius: 0.5,
            border: "1.5px solid var(--color-border)",
            backgroundColor: "var(--color-card)",
            color: "var(--color-muted-foreground)",
            "&:hover": { backgroundColor: "var(--color-muted)" },
          }}
        >
          <MicNoneIcon fontSize={size === "large" ? "medium" : "small"} />
        </IconButton>
      </span>
    </Tooltip>
  );
}
