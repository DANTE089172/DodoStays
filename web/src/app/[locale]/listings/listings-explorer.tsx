"use client";

import { useState } from "react";
import { Box } from "@mui/material";
import { ListingsList } from "@/components/search/listings-list";
import { ListingMap } from "@/components/search/listing-map";
import { AnchorList } from "@/components/search/anchor-list";
import { SearchAsIMoveToggle } from "@/components/search/search-as-i-move-toggle";
import type { ListingSummary } from "@/lib/listings";

interface Props {
  items: ListingSummary[];
}

export function ListingsExplorer({ items }: Props) {
  const [highlightId, setHighlightId] = useState<string | null>(null);

  return (
    <Box
      sx={{
        display: "grid",
        gap: 3,
        gridTemplateColumns: { xs: "1fr", lg: "minmax(0, 2fr) minmax(0, 3fr)" },
      }}
    >
      <Box
        component="section"
        sx={{
          order: { xs: 2, lg: 1 },
          maxHeight: { lg: "78vh" },
          overflowY: { lg: "auto" },
          pr: { lg: 1 },
        }}
      >
        <AnchorList />
        <ListingsList items={items} highlightId={highlightId} onCardHover={setHighlightId} />
      </Box>
      <Box component="section" sx={{ order: { xs: 1, lg: 2 } }}>
        <Box sx={{ display: "flex", justifyContent: "flex-end", pb: 1 }}>
          <SearchAsIMoveToggle />
        </Box>
        <Box
          sx={{
            height: { xs: "60vh", lg: "78vh" },
            border: "1.5px solid var(--color-border)",
            borderRadius: "2px",
            overflow: "hidden",
          }}
        >
          <ListingMap listings={items} highlightId={highlightId} onPinHover={setHighlightId} />
        </Box>
      </Box>
    </Box>
  );
}
