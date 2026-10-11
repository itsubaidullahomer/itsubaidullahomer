"use client";

import { useMemo, type ReactNode } from "react";
import { createScreenshotSwipe } from "@/lib/screenshot-swipe";

export function ScreenshotViewport({
  actualSize,
  multiple,
  label,
  onStep,
  children,
}: {
  actualSize: boolean;
  multiple: boolean;
  label: string;
  onStep: (direction: -1 | 1) => void;
  children: ReactNode;
}) {
  const swipeEnabled = multiple && !actualSize;
  const handlers = useMemo(
    () =>
      createScreenshotSwipe({
        canSwipe: () =>
          swipeEnabled && (window.visualViewport?.scale ?? 1) <= 1,
        onStep,
      }),
    [swipeEnabled, onStep],
  );

  return (
    <>
      <div
        className={`tututor-lightbox-image${actualSize ? " is-actual-size" : ""}`}
        data-swipe-enabled={swipeEnabled || undefined}
        tabIndex={0}
        role="region"
        aria-label={`${label}. ${actualSize ? "Scroll to explore at original size." : multiple ? "Swipe left or right to change screenshots." : "Full screenshot."}`}
        {...handlers}
      >
        {children}
      </div>
      {multiple && (
        <p className="screenshot-swipe-hint" aria-hidden="true">
          {actualSize
            ? "Scroll to explore · Fit to window to swipe"
            : "Swipe left or right to explore"}
        </p>
      )}
    </>
  );
}
