import * as React from "react";
import { cn } from "@/lib/utils";

type Level = 1 | 2 | 3 | 4;

interface DisplayHeadingProps {
  level: Level;
  italic?: boolean;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

const SIZE_BY_LEVEL: Record<Level, string> = {
  1: "ds-display-xl",
  2: "ds-display-lg",
  3: "ds-display-md",
  4: "ds-display-sm",
};

/**
 * Fraunces editorial heading (Onepirate display tier).
 *
 * `level` controls BOTH the semantic tag (h1..h4) AND the visual size — they
 * line up by default. Italic flips on Fraunces' italic axis (a hero affordance
 * Onepirate uses for emphasis on close-CTA headlines).
 */
export function DisplayHeading({
  level,
  italic = false,
  children,
  className,
  id,
}: DisplayHeadingProps) {
  const Tag = `h${level}` as "h1" | "h2" | "h3" | "h4";
  return (
    <Tag
      id={id}
      className={cn(
        SIZE_BY_LEVEL[level],
        italic && "italic",
        "text-[color:inherit]",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
