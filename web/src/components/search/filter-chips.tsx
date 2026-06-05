"use client";

import { Chip, Stack } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useRouter } from "next/navigation";
import { type ParsedFilters, filtersToSearchParams } from "@/lib/search";

interface Props {
  filters: ParsedFilters;
  preserveParams?: string[];
}

export function FilterChips({ filters, preserveParams = [] }: Props) {
  const router = useRouter();
  const chips = buildChips(filters);
  if (chips.length === 0) return null;

  function removeChip(remove: (f: ParsedFilters) => ParsedFilters) {
    const next = remove(filters);
    const sp = filtersToSearchParams(next);
    if (typeof window !== "undefined") {
      const current = new URLSearchParams(window.location.search);
      for (const k of preserveParams) {
        const v = current.get(k);
        if (v) sp.set(k, v);
      }
    }
    router.push(`/listings?${sp.toString()}`);
  }

  return (
    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ py: 1.5 }}>
      {chips.map((c) => (
        <Chip
          key={c.key}
          label={c.label}
          variant="outlined"
          deleteIcon={<CloseIcon />}
          onDelete={() => removeChip(c.remove)}
          sx={chipSx}
        />
      ))}
    </Stack>
  );
}

// Onepirate-flavoured filter chip:
//   - cream surface (var(--color-card)), ink text
//   - 1px peach border (active state — chip is, by definition, an active filter)
//   - rounded-full pill shape, Plex Sans 13px, tracked
//   - subtle peach tint on hover
const chipSx = {
  fontFamily: "var(--font-plex)",
  fontSize: "0.8125rem",
  letterSpacing: "0.04em",
  height: 32,
  borderRadius: "9999px",
  backgroundColor: "var(--color-card)",
  color: "var(--color-foreground)",
  borderColor: "var(--color-primary)",
  borderWidth: "1px",
  transition: "background-color 180ms ease-out, border-color 180ms ease-out",
  "& .MuiChip-label": {
    px: 1.5,
  },
  "& .MuiChip-deleteIcon": {
    color: "color-mix(in srgb, var(--color-foreground) 65%, transparent)",
    fontSize: "1rem",
    transition: "color 180ms ease-out",
  },
  "&:hover": {
    backgroundColor: "color-mix(in srgb, var(--color-primary) 8%, var(--color-card))",
    borderColor: "var(--color-primary)",
  },
  "&:hover .MuiChip-deleteIcon": {
    color: "var(--color-foreground)",
  },
};

function buildChips(f: ParsedFilters): { key: string; label: string; remove: (f: ParsedFilters) => ParsedFilters }[] {
  const c: { key: string; label: string; remove: (f: ParsedFilters) => ParsedFilters }[] = [];
  if (f.region) c.push({ key: "r", label: f.region.replace(/-/g, " "), remove: (x) => ({ ...x, region: null }) });
  if (f.propertyType) c.push({ key: "t", label: f.propertyType, remove: (x) => ({ ...x, propertyType: null }) });
  if (f.minBedrooms !== null) c.push({ key: "b", label: `${f.minBedrooms}+ beds`, remove: (x) => ({ ...x, minBedrooms: null }) });
  if (f.minGuests !== null) c.push({ key: "g", label: `${f.minGuests}+ guests`, remove: (x) => ({ ...x, minGuests: null }) });
  if (f.maxNightlyMur !== null) c.push({ key: "max", label: `≤ MUR ${f.maxNightlyMur.toLocaleString()}`, remove: (x) => ({ ...x, maxNightlyMur: null }) });
  if (f.minNightlyMur !== null) c.push({ key: "min", label: `≥ MUR ${f.minNightlyMur.toLocaleString()}`, remove: (x) => ({ ...x, minNightlyMur: null }) });
  for (const a of f.requiredAmenities) c.push({ key: `a-${a}`, label: a, remove: (x) => ({ ...x, requiredAmenities: x.requiredAmenities.filter((y) => y !== a) }) });
  if (f.verifiedOnly) c.push({ key: "v", label: "verified only", remove: (x) => ({ ...x, verifiedOnly: false }) });
  return c;
}
