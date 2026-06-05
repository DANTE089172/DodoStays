"use client";

import * as React from "react";
import { Drawer } from "vaul";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
  /**
   * Optional snap points (vaul format — strings like "0.4" / "300px"
   * or numbers in px). When omitted vaul falls back to its single-snap
   * default, which is the right call for most filter sheets.
   */
  snapPoints?: (string | number)[];
  className?: string;
}

/**
 * Mobile-only bottom sheet built on `vaul`. iOS-style spring physics, a
 * peach grab handle, and Fraunces title — desktop callers should keep
 * their existing modal/drawer chrome and rely on the `md:hidden` wrapper
 * here to hide the sheet at md+ breakpoints.
 *
 * The component renders nothing on desktop (its outer wrapper is gated
 * with `md:hidden` via Tailwind), but to keep callers tidy we don't try
 * to short-circuit at render time — vaul handles the unmount when
 * `open` is false, and the wrapper hides any portal-leaked layers on md.
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  children,
  snapPoints,
  className,
}: BottomSheetProps) {
  return (
    <div className="md:hidden">
      <Drawer.Root
        open={open}
        onOpenChange={onOpenChange}
        snapPoints={snapPoints}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-[var(--color-ink)]/50" />
          <Drawer.Content
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 mt-24 flex max-h-[92vh] flex-col rounded-t-2xl bg-[var(--color-sand)] text-[var(--color-ink)] shadow-[0_-8px_32px_rgba(20,12,8,0.18)] outline-none",
              className,
            )}
          >
            {/* Peach grab handle — 4px tall, 40px wide, centered */}
            <div className="flex w-full justify-center pt-3 pb-2">
              <Drawer.Handle
                className="!h-1 !w-10 !rounded-full !bg-[var(--color-primary)]"
                aria-label="Drag handle"
              />
            </div>

            {title ? (
              <Drawer.Title asChild>
                <h2 className="px-6 pb-2 font-display text-2xl tracking-[-0.02em]">
                  {title}
                </h2>
              </Drawer.Title>
            ) : null}

            <div className="flex-1 overflow-y-auto px-6 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-2">
              {children}
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
