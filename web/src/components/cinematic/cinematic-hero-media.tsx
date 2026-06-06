"use client";

import * as React from "react";

interface Props {
  /** Direct URL to the hero video clip (mp4 preferred, <8s loop-friendly). */
  videoSrc: string;
  /** Poster still — also used as the mobile + reduced-motion fallback. */
  posterSrc: string;
  /** Alt text for the poster image (the video itself is decorative). */
  alt: string;
}

/**
 * Hero media — autoplays a muted, looping video on desktop with motion
 * preferences. On mobile (<768px) and for users who prefer reduced motion,
 * we render only the poster image to save data and respect motion-sensitive
 * users. The poster image picks up the Ken-Burns class so even the static
 * fallback feels alive.
 *
 * The same ink scrim that shipped with the original photo hero is applied
 * here so legibility is preserved and REQ-13 (subtitle contrast) stays
 * addressed regardless of which media path renders.
 */
export function CinematicHeroMedia({ videoSrc, posterSrc, alt }: Props) {
  const [showVideo, setShowVideo] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const wide = window.matchMedia("(min-width: 768px)");
    const motionOk = window.matchMedia("(prefers-reduced-motion: no-preference)");

    const compute = () => setShowVideo(wide.matches && motionOk.matches);
    compute();

    const listener = () => compute();
    wide.addEventListener("change", listener);
    motionOk.addEventListener("change", listener);
    return () => {
      wide.removeEventListener("change", listener);
      motionOk.removeEventListener("change", listener);
    };
  }, []);

  return (
    <div className="absolute inset-0 z-[1]">
      {showVideo ? (
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={posterSrc}
          aria-hidden="true"
          className="h-full w-full object-cover"
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={posterSrc}
          alt={alt}
          className="ken-burns-active h-full w-full object-cover"
        />
      )}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(10,9,8,0.15), rgba(10,9,8,0.45))",
        }}
      />
    </div>
  );
}
