"use client";

import { Chip, Stack } from "@mui/material";
import { useRouter } from "next/navigation";
import { parseSearch, filtersToSearchParams } from "@/lib/search";

const EXAMPLES = [
  "3 beds Flic en Flac with pool",
  "verified villa walking to beach",
  "honeymoon villa under MUR 7000",
  "apartment in Grand Baie for 4 guests",
  "quiet villa with garden in Tamarin",
];

export function ExampleQueries() {
  const router = useRouter();

  async function fire(text: string) {
    try {
      const res = await parseSearch(text);
      const sp = filtersToSearchParams(res.filters);
      sp.set("q", text);
      router.push(`/listings?${sp.toString()}`);
    } catch {
      // soft fail — fall back to a plain text URL parameter
      const sp = new URLSearchParams();
      sp.set("q", text);
      router.push(`/listings?${sp.toString()}`);
    }
  }

  return (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 2, justifyContent: "center" }}>
      {EXAMPLES.map((q) => (
        <Chip
          key={q}
          label={q}
          variant="outlined"
          onClick={() => fire(q)}
          sx={{
            fontFamily: "var(--font-caveat)",
            fontSize: "1rem",
            height: 32,
            backgroundColor: "transparent",
            "&:hover": { backgroundColor: "var(--color-muted)", borderColor: "var(--color-foreground)" },
          }}
        />
      ))}
    </Stack>
  );
}
