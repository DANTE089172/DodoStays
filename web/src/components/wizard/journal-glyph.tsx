"use client";

/**
 * JournalGlyph — pure SVG icons with a hand-drawn feel.
 *
 * Stroke uses `currentColor` so the parent (or the `tone` prop, which sets
 * a Tailwind text color via CSS variables) controls the colour. Each glyph
 * hints at the content of its corresponding wizard step.
 */

export type JournalGlyphName =
  | "compass"
  | "bed"
  | "kitchen"
  | "camera"
  | "calendar"
  | "price"
  | "rules"
  | "preview";

export type JournalGlyphTone = "peach" | "ink" | "sand";

interface JournalGlyphProps {
  name: JournalGlyphName;
  size?: number;
  tone?: JournalGlyphTone;
  className?: string;
  title?: string;
}

const TONE_CLASS: Record<JournalGlyphTone, string> = {
  peach: "text-[var(--color-primary)]",
  ink: "text-[var(--color-ink)]",
  sand: "text-[var(--color-sand-deep)]",
};

export function JournalGlyph({
  name,
  size = 28,
  tone = "peach",
  className,
  title,
}: JournalGlyphProps) {
  const commonProps = {
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={[TONE_CLASS[tone], className].filter(Boolean).join(" ")}
    >
      {title ? <title>{title}</title> : null}
      {renderGlyph(name, commonProps)}
    </svg>
  );
}

function renderGlyph(
  name: JournalGlyphName,
  p: {
    fill: "none";
    stroke: string;
    strokeWidth: number;
    strokeLinecap: "round";
    strokeLinejoin: "round";
  },
) {
  switch (name) {
    case "compass":
      // a compass rose — circle + four-pointed star, slightly tilted
      return (
        <g transform="rotate(8 16 16)">
          <circle cx="16" cy="16" r="11" {...p} />
          <path d="M16 6 L18 16 L26 16 L18 16 L16 26 L14 16 L6 16 L14 16 Z" {...p} />
        </g>
      );
    case "bed":
      // a bed seen from the side — pillow + frame + leg
      return (
        <g>
          <path d="M5 20 L5 14 L27 14 L27 20" {...p} />
          <path d="M5 20 L5 24 M27 20 L27 24" {...p} />
          <path d="M5 20 L27 20" {...p} />
          <path d="M8 14 L8 11 Q8 10 9 10 L15 10 Q16 10 16 11 L16 14" {...p} />
        </g>
      );
    case "kitchen":
      // a pot with a lid + steam swirl
      return (
        <g>
          <path d="M7 14 L7 22 Q7 25 10 25 L22 25 Q25 25 25 22 L25 14" {...p} />
          <path d="M5 14 L27 14" {...p} />
          <path d="M14 14 L14 11 L18 11 L18 14" {...p} />
          <path
            d="M12 8 Q14 6 16 8 Q18 10 20 8"
            {...p}
            transform="rotate(-3 16 8)"
          />
        </g>
      );
    case "camera":
      // a small camera body with a lens circle
      return (
        <g>
          <path d="M4 12 L9 12 L11 9 L21 9 L23 12 L28 12 L28 24 L4 24 Z" {...p} />
          <circle cx="16" cy="17" r="4.5" {...p} />
          <circle cx="24" cy="13.5" r="0.6" fill="currentColor" stroke="none" />
        </g>
      );
    case "calendar":
      // a desk calendar — top binding, page, date mark
      return (
        <g>
          <path d="M5 9 L27 9 L27 25 L5 25 Z" {...p} />
          <path d="M5 13 L27 13" {...p} />
          <path d="M10 7 L10 11 M22 7 L22 11" {...p} />
          <path d="M14 18 L18 18 M16 16 L16 22" {...p} />
        </g>
      );
    case "price":
      // a price tag with a string hole + slight tilt
      return (
        <g transform="rotate(-12 16 16)">
          <path d="M6 10 L18 6 L26 14 L14 26 L6 18 Z" {...p} />
          <circle cx="11" cy="13" r="1.3" {...p} />
          <path d="M14 18 L20 18 M14 21 L18 21" {...p} />
        </g>
      );
    case "rules":
      // a lined notebook — a list with checkmarks
      return (
        <g>
          <path d="M7 6 L25 6 L25 26 L7 26 Z" {...p} />
          <path d="M11 11 L21 11 M11 16 L21 16 M11 21 L19 21" {...p} />
          <path d="M9 11 L9.5 11.6 M9 16 L9.5 16.6 M9 21 L9.5 21.6" {...p} />
        </g>
      );
    case "preview":
      // an eye glyph — slight asymmetry for the hand-drawn feel
      return (
        <g>
          <path d="M3 16 Q10 8 16 8 Q22 8 29 16 Q22 24 16 24 Q10 24 3 16 Z" {...p} />
          <circle cx="16" cy="16" r="3.2" {...p} />
          <circle cx="17" cy="15" r="0.7" fill="currentColor" stroke="none" />
        </g>
      );
  }
}

export default JournalGlyph;
