"use client";

import { createTheme } from "@mui/material/styles";

// Sega & Sand palette mapping. Values mirror the CSS vars in globals.css so
// MUI components blend with the hand-rolled brand chrome.
export const segaTheme = createTheme({
  palette: {
    mode: "light",
    background: { default: "#F5EFE6", paper: "#FFFFFF" },
    text: { primary: "#1A1410", secondary: "#5A4A3A" },
    primary: { main: "#1E3A8A", contrastText: "#F5EFE6" }, // cobalt
    secondary: { main: "#E8633C", contrastText: "#FFFFFF" }, // warm terracotta
    error: { main: "#B53017" },
    warning: { main: "#D4A24C" }, // ochre
    info: { main: "#2A8FA5" }, // lagoon
    success: { main: "#6E8C3F" }, // sugar cane
    divider: "#C9B89A",
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
      styleOverrides: { body: { backgroundColor: "#F5EFE6" } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true, disableRipple: false },
      styleOverrides: {
        root: { borderRadius: 6, paddingInline: 16, height: 44 },
        containedPrimary: {
          boxShadow: "2px 2px 0 #1A1410",
          "&:hover": { boxShadow: "2px 2px 0 #1A1410", filter: "brightness(0.95)" },
        },
      },
    },
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: "none" } } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          "& fieldset": { borderColor: "#C9B89A", borderWidth: 1.5 },
          "&:hover fieldset": { borderColor: "#1A1410 !important" },
          "&.Mui-focused fieldset": { borderColor: "#1E3A8A !important", borderWidth: 2 },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { color: "#5A4A3A", "&.Mui-focused": { color: "#1E3A8A" } },
      },
    },
    MuiChip: {
      // Filter chips are labels, not card-like — keep them tight (2px) but let
      // hover hint a warm terracotta tint instead of a beige fill.
      styleOverrides: {
        root: {
          borderRadius: 2,
          fontWeight: 500,
          "&:hover": { backgroundColor: "rgba(232,99,60,0.08)" },
        },
        outlined: { borderWidth: 1.5, borderColor: "#C9B89A" },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: "#1A1410", fontFamily: 'var(--font-plex)', fontSize: 12 },
      },
    },
    MuiAutocomplete: {
      styleOverrides: { paper: { borderRadius: 6, border: "1.5px solid #C9B89A" } },
    },
    MuiSnackbarContent: {
      styleOverrides: {
        root: { backgroundColor: "#1A1410", color: "#F5EFE6", borderRadius: 6 },
      },
    },
    MuiSlider: {
      styleOverrides: {
        thumb: { backgroundColor: "#1E3A8A" },
        track: { backgroundColor: "#1E3A8A" },
        rail: { backgroundColor: "#C9B89A" },
      },
    },
  },
});
