"use client";

// TODO: remove before launch — dev-only sandbox for the new non-MUI UI
// primitives (vaul bottom sheet + embla photo gallery). Lets us eyeball
// the components in isolation, without needing a real listing on the
// backend or a production filter drawer to wire into.

import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PhotoGallery } from "@/components/listings/photo-gallery";
import { Button } from "@/components/ui/button";

const SAMPLE_PHOTOS = [
  {
    url: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1600&q=80",
    caption: "Lagoon at golden hour — Belle Mare",
  },
  {
    url: "https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1600&q=80",
    caption: "Tropical villa terrace",
  },
  {
    url: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=1600&q=80",
    caption: "Pool deck looking west",
  },
  {
    url: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=80",
    caption: "Beachfront morning",
  },
];

export default function UiPreviewPage() {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12 sm:px-10">
      <h1 className="font-display text-4xl tracking-[-0.02em]">UI Preview</h1>
      <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
        Dev-only sandbox for the photo gallery (embla) and mobile bottom
        sheet (vaul) primitives.
      </p>

      <section className="mt-10">
        <h2 className="font-display text-2xl tracking-[-0.02em]">
          Photo gallery (16/9)
        </h2>
        <div className="mt-4">
          <PhotoGallery photos={SAMPLE_PHOTOS} aspectRatio="16/9" />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl tracking-[-0.02em]">
          Photo gallery (4/3)
        </h2>
        <div className="mt-4">
          <PhotoGallery photos={SAMPLE_PHOTOS} aspectRatio="4/3" />
        </div>
      </section>

      <section className="mt-12">
        <h2 className="font-display text-2xl tracking-[-0.02em]">
          Bottom sheet (mobile only)
        </h2>
        <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
          The trigger renders on every viewport so we can click it on
          desktop, but the sheet itself is gated `md:hidden` and only
          opens on small screens. Use a phone or shrink your viewport
          below the `md` breakpoint to see it.
        </p>
        <div className="mt-4">
          <Button type="button" onClick={() => setSheetOpen(true)}>
            Open filter sheet
          </Button>
        </div>

        <BottomSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title="Filters"
        >
          <div className="space-y-6 pt-4">
            <div>
              <p className="font-script text-lg text-[var(--color-ochre)]">
                price range
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                Demo content — wire into real filter form fields when the
                desktop drawer story lands.
              </p>
            </div>
            <div>
              <p className="font-script text-lg text-[var(--color-ochre)]">
                bedrooms
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[1, 2, 3, 4, "5+"].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className="h-10 min-w-10 rounded-full border-[1.5px] border-[var(--color-border)] bg-[var(--color-card)] px-4 text-sm transition-colors duration-200 ease-out hover:bg-[var(--color-muted)]"
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-4">
              <Button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="w-full"
              >
                Apply filters
              </Button>
            </div>
          </div>
        </BottomSheet>
      </section>
    </main>
  );
}
