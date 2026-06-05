"use client";

import { createTheme } from "@mui/material/styles";

// Peach Orb palette mapping. Values mirror the CSS vars in globals.css so
// MUI components blend with the hand-rolled brand chrome.  Primary is now
// peach (#FF9F6A) — the orb color; secondary is downgraded cobalt for
// anchor-pin / "Sign in" link semantics.
export const segaTheme = createTheme({
  palette: {
    mode: "light",
    background: { default: "#FAF3EA", paper: "#FFFFFF" },
    text: { primary: "#1A1410", secondary: "#5A4A3A" },
    primary:   { main: "#FF9F6A", contrastText: "#1A1410" },   // peach
    secondary: { main: "#1E3A8A", contrastText: "#F5EFE6" },   // cobalt downgraded
    error:     { main: "#B53017" },
    warning:   { main: "#D4A24C" }, // ochre
    info:      { main: "#2A8FA5" }, // lagoon
    success:   { main: "#6E8C3F" }, // sugar cane
    divider:   "#E5D6C2",
  },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: 'var(--font-plex), "IBM Plex Sans", system-ui, sans-serif',
    h1: { fontFamily: 'var(--font-fraunces), Georgia, serif', fontWeight: 600 },
    h2: { fontFamily: 'var(--font-fraunces), Georgia, serif', fontWeight: 600 },
    h3: { fontFamily: 'var(--font-fraunces), Georgia, serif', fontWeight: 600 },
    h4: { fontFamily: 'var(--font-fraunces), Georgia, serif', fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600, letterSpacing: "0.01em" },
    body1: { lineHeight: 1.6 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: { body: { backgroundColor: "#FAF3EA" } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true, disableRipple: false },
      styleOverrides: {
        root: { borderRadius: 6, paddingInline: 16, height: 44 },
        // Keep the hard-offset shadow but DON'T let MUI's auto-darken on hover
        // crush peach below ~0.85 brightness — peach loses its glow when too
        // dark.  Pin the hover background to a slightly darker peach instead.
        containedPrimary: {
          boxShadow: "2px 2px 0 #1A1410",
          "&:hover": {
            boxShadow: "2px 2px 0 #1A1410",
            filter: "brightness(0.95)",
            backgroundColor: "#FF8C50",
          },
        },
      },
    },
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: "none" } } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          "& fieldset": { borderColor: "#E5D6C2", borderWidth: 1.5 },
          "&:hover fieldset": { borderColor: "#1A1410 !important" },
          "&.Mui-focused fieldset": { borderColor: "#FF9F6A !important", borderWidth: 2 },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { color: "#5A4A3A", "&.Mui-focused": { color: "#FF9F6A" } },
      },
    },
    MuiChip: {
      // Filter chips are labels, not card-like — keep them tight (2px) but let
      // hover hint a warm peach tint instead of a beige fill.
      styleOverrides: {
        root: {
          borderRadius: 2,
          fontWeight: 500,
          "&:hover": { backgroundColor: "rgba(255,159,106,0.10)" },
        },
        outlined: { borderWidth: 1.5, borderColor: "#E5D6C2" },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: "#1A1410", fontFamily: 'var(--font-plex)', fontSize: 12 },
      },
    },
    MuiAutocomplete: {
      styleOverrides: { paper: { borderRadius: 6, border: "1.5px solid #E5D6C2" } },
    },
    MuiSnackbarContent: {
      styleOverrides: {
        root: { backgroundColor: "#1A1410", color: "#F5EFE6", borderRadius: 6 },
      },
    },
    MuiSlider: {
      // Sliders pick up peach so the value-track reads as primary; the rail
      // stays the soft ochre line.
      styleOverrides: {
        thumb: { backgroundColor: "#FF9F6A" },
        track: { backgroundColor: "#FF9F6A" },
        rail: { backgroundColor: "#E5D6C2" },
      },
    },
  },
});
