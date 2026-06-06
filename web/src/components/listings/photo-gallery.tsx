"use client";

import * as React from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CinematicPhoto } from "@/components/cinematic";

export type GalleryPhoto = {
  url: string;
  caption?: string | null;
};

type AspectRatio = "16/9" | "4/3" | "1/1";

interface PhotoGalleryProps {
  photos: GalleryPhoto[];
  aspectRatio?: AspectRatio;
  className?: string;
}

const ASPECT_CLASS: Record<AspectRatio, string> = {
  "16/9": "aspect-[16/9]",
  "4/3": "aspect-[4/3]",
  "1/1": "aspect-square",
};

/**
 * Horizontal photo carousel for the listing detail page. Edge-to-edge on
 * mobile, contained to the page max-width on desktop. Tapping a slide opens
 * a fullscreen lightbox built on the native <dialog> element so we ship no
 * extra modal runtime.
 *
 * Embla options are intentionally minimal — loop, no drag-free, centered
 * align — to keep the feel close to Airbnb's restrained gallery.
 */
export function PhotoGallery({
  photos,
  aspectRatio = "16/9",
  className,
}: PhotoGalleryProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    dragFree: false,
    align: "center",
  });
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [lightboxIndex, setLightboxIndex] = React.useState(0);
  const dialogRef = React.useRef<HTMLDialogElement | null>(null);

  React.useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi]);

  const scrollPrev = React.useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = React.useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const openLightbox = React.useCallback((idx: number) => {
    setLightboxIndex(idx);
    setLightboxOpen(true);
  }, []);

  // Sync the <dialog> element with the lightboxOpen state.
  React.useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (lightboxOpen && !dlg.open) {
      dlg.showModal();
    } else if (!lightboxOpen && dlg.open) {
      dlg.close();
    }
  }, [lightboxOpen]);

  if (photos.length === 0) return null;

  const aspectClass = ASPECT_CLASS[aspectRatio];
  const total = photos.length;

  return (
    <div className={cn("relative w-full", className)}>
      <div
        className="overflow-hidden bg-[var(--color-muted)] sm:rounded-[12px]"
        ref={emblaRef}
      >
        <div className="flex">
          {photos.map((photo, idx) => (
            <div
              key={`${photo.url}-${idx}`}
              className={cn("relative min-w-0 flex-[0_0_100%]", aspectClass)}
            >
              <PhotoSlide
                photo={photo}
                onClick={() => openLightbox(idx)}
                priority={idx === 0}
                isActive={idx === selectedIndex}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Prev / Next chevrons — desktop only; mobile users swipe. */}
      {total > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous photo"
            onClick={scrollPrev}
            className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border-[1.5px] border-[var(--color-border)] bg-[var(--color-card)]/95 text-[var(--color-ink)] shadow-sm transition-colors duration-200 ease-out hover:bg-[var(--color-sand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] md:flex"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={scrollNext}
            className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border-[1.5px] border-[var(--color-border)] bg-[var(--color-card)]/95 text-[var(--color-ink)] shadow-sm transition-colors duration-200 ease-out hover:bg-[var(--color-sand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] md:flex"
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </>
      )}

      {/* Counter pill — bottom-right */}
      {total > 1 && (
        <div className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-[var(--color-sand)]/95 px-3 py-1 text-[var(--color-ink)]">
          <span className="small-caps text-xs">
            {selectedIndex + 1} / {total}
          </span>
        </div>
      )}

      <PhotoLightbox
        ref={dialogRef}
        photos={photos}
        startIndex={lightboxIndex}
        onClose={() => setLightboxOpen(false)}
        open={lightboxOpen}
      />
    </div>
  );
}

interface PhotoSlideProps {
  photo: GalleryPhoto;
  onClick: () => void;
  priority?: boolean;
  isActive?: boolean;
}

function PhotoSlide({ photo, onClick, priority, isActive }: PhotoSlideProps) {
  const [loaded, setLoaded] = React.useState(false);
  // Bump a counter every time this slide becomes active, then use it as the
  // `key` of an inner wrapper <span>. The wrapper remounts (cheap — no <img>
  // network re-paint) and React re-applies `.ken-burns-active`, which the
  // browser treats as a fresh animation. Mirrors the derived-state-during-
  // render pattern used by PhotoLightbox below — no setState-in-effect.
  const [activeRun, setActiveRun] = React.useState(0);
  const [lastActive, setLastActive] = React.useState<boolean>(Boolean(isActive));
  if (Boolean(isActive) !== lastActive) {
    setLastActive(Boolean(isActive));
    if (isActive) setActiveRun((n) => n + 1);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={photo.caption ? `Open photo: ${photo.caption}` : "Open photo"}
      className="group relative h-full w-full overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-ring)]"
    >
      {/* Peach-tinted aspect placeholder until the image paints */}
      {!loaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[var(--color-peach-50)]"
        />
      )}
      <span
        // Wrapper remounts on activation so the keyframe restarts. The inner
        // <img> stays mounted across re-runs because it's keyed only on URL.
        key={isActive ? `run-${activeRun}` : "idle"}
        className={cn(
          "block h-full w-full",
          isActive && "ken-burns-active",
        )}
      >
        <CinematicPhoto
          src={photo.url}
          alt={photo.caption ?? ""}
          grade="warm"
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          className={cn(
            "h-full w-full object-cover transition-opacity duration-300 ease-out",
            loaded ? "opacity-100" : "opacity-0",
          )}
        />
      </span>
    </button>
  );
}

interface PhotoLightboxProps {
  photos: GalleryPhoto[];
  startIndex: number;
  open: boolean;
  onClose: () => void;
}

const PhotoLightbox = React.forwardRef<HTMLDialogElement, PhotoLightboxProps>(
  function PhotoLightbox({ photos, startIndex, open, onClose }, ref) {
    // Track the last `startIndex` we rendered so we can reset our local
    // navigation index whenever the gallery opens at a new slide — without
    // a state-mutating effect (per react-hooks/set-state-in-effect).
    const [index, setIndex] = React.useState(startIndex);
    const [lastStart, setLastStart] = React.useState(startIndex);
    if (startIndex !== lastStart) {
      setLastStart(startIndex);
      setIndex(startIndex);
    }

    const prev = React.useCallback(
      () => setIndex((i) => (i - 1 + photos.length) % photos.length),
      [photos.length],
    );
    const next = React.useCallback(
      () => setIndex((i) => (i + 1) % photos.length),
      [photos.length],
    );

    React.useEffect(() => {
      if (!open) return;
      const handler = (e: KeyboardEvent) => {
        if (e.key === "ArrowLeft") prev();
        else if (e.key === "ArrowRight") next();
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }, [open, prev, next]);

    const current = photos[index];
    if (!current) return null;

    return (
      <dialog
        ref={ref}
        onClose={onClose}
        onCancel={onClose}
        className="m-0 h-full max-h-none w-full max-w-none bg-[var(--color-ink)]/95 p-0 text-[var(--color-sand)] backdrop:bg-[var(--color-ink)]/80"
      >
        <div className="relative flex h-screen w-screen items-center justify-center">
          <button
            type="button"
            aria-label="Close gallery"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-sand)]/95 text-[var(--color-ink)] transition-colors duration-200 ease-out hover:bg-[var(--color-sand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={prev}
                className="absolute left-4 top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--color-sand)]/95 text-[var(--color-ink)] transition-colors duration-200 ease-out hover:bg-[var(--color-sand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              >
                <ChevronLeft className="h-6 w-6" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={next}
                className="absolute right-4 top-1/2 z-10 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--color-sand)]/95 text-[var(--color-ink)] transition-colors duration-200 ease-out hover:bg-[var(--color-sand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              >
                <ChevronRight className="h-6 w-6" aria-hidden="true" />
              </button>
            </>
          )}

          <figure className="flex max-h-full max-w-full flex-col items-center justify-center px-4 py-16">
            <CinematicPhoto
              src={current.url}
              alt={current.caption ?? ""}
              grade="moody"
              className="max-h-[80vh] max-w-full object-contain"
            />
            {current.caption ? (
              <figcaption className="mt-4 max-w-2xl text-center text-sm text-[var(--color-sand)]/80">
                {current.caption}
              </figcaption>
            ) : null}
            {photos.length > 1 && (
              <div className="mt-3 small-caps text-xs text-[var(--color-sand)]/70">
                {index + 1} / {photos.length}
              </div>
            )}
          </figure>
        </div>
      </dialog>
    );
  },
);
