"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Autocomplete, Box, Button, CircularProgress, TextField } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { parseSearch, filtersToSearchParams, type ParsedFilters } from "@/lib/search";
import { VoiceButton } from "./voice-button";

interface Props {
  initialText?: string;
  initialFilters?: ParsedFilters | null;
  preserveParams?: string[]; // copy these query params from current URL into the new URL
  variant?: "hero" | "page";
}

const RECENT_SUGGESTIONS = [
  "3 beds Flic en Flac with pool",
  "verified villa walking to beach",
  "honeymoon villa under MUR 7000",
  "apartment in Grand Baie for 4 guests",
  "quiet villa with garden in Tamarin",
  "le morne villa with mountain views",
  "beachfront for 6 guests under 8000",
];

export function AiSearchBar({ initialText = "", initialFilters = null, preserveParams = [], variant = "page" }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(initialText);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(text?: string) {
    const trimmed = (text ?? value).trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await parseSearch(trimmed, initialFilters);
      const sp = filtersToSearchParams(res.filters);
      sp.set("q", trimmed);
      if (typeof window !== "undefined") {
        const current = new URLSearchParams(window.location.search);
        for (const k of preserveParams) {
          const v = current.get(k);
          if (v) sp.set(k, v);
        }
      }
      router.push(`/listings?${sp.toString()}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const isHero = variant === "hero";

  return (
    <Box
      component="form"
      onSubmit={(e) => { e.preventDefault(); submit(); }}
      sx={{
        width: "100%",
        maxWidth: isHero ? 760 : 720,
        mx: "auto",
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        p: 1.5,
        backgroundColor: "var(--color-card)",
        border: "2px solid var(--color-foreground)",
        borderRadius: "2px",
        boxShadow: "4px 4px 0 var(--color-foreground)",
      }}
    >
      <Autocomplete
        freeSolo
        fullWidth
        options={RECENT_SUGGESTIONS}
        value={value}
        onInputChange={(_, v) => setValue(v ?? "")}
        onChange={(_, v) => {
          if (typeof v === "string") {
            setValue(v);
            submit(v);
          }
        }}
        sx={{ flex: 1 }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Tell us where, when, what — e.g. 3 beds Flic en Flac with pool, under 5000 MUR"
            variant="standard"
            slotProps={{
              input: {
                ...params.InputProps,
                disableUnderline: true,
                sx: {
                  fontFamily: "var(--font-plex)",
                  fontSize: isHero ? "1.25rem" : "1.1rem",
                  height: isHero ? 56 : 48,
                  px: 2,
                  "&::placeholder": { color: "var(--color-muted-foreground)" },
                },
              },
            }}
          />
        )}
      />
      <VoiceButton size="large" />
      <Button
        type="submit"
        variant="contained"
        color="primary"
        size="large"
        disabled={busy}
        startIcon={busy ? <CircularProgress size={18} sx={{ color: "inherit" }} /> : <SearchIcon />}
        sx={{
          height: 56,
          minWidth: 140,
          fontSize: "1rem",
          fontFamily: "var(--font-plex)",
          textTransform: "none",
        }}
      >
        {busy ? "Searching" : "Search"}
      </Button>
      {error && (
        <Box role="alert" sx={{ ml: 2, color: "var(--color-destructive)", fontSize: "0.875rem" }}>
          {error}
        </Box>
      )}
    </Box>
  );
}
