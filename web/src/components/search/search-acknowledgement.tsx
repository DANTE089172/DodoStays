import { Box } from "@mui/material";

interface Props {
  text: string | null;
}

export function SearchAcknowledgement({ text }: Props) {
  if (!text) return null;
  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        textAlign: "center",
        mt: 1.5,
        fontFamily: "var(--font-caveat)",
        color: "var(--ds-ochre, #D4A24C)",
        fontSize: "1.25rem",
        fontStyle: "italic",
      }}
    >
      {text}
    </Box>
  );
}
