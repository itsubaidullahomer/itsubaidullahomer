"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import { createScreenshotSwipe } from "@/lib/screenshot-swipe";

export function ScreenshotViewport({
  actualSize,
  multiple,
  label,
  onStep,
  children,
  previous,
  next,
}: {
  actualSize: boolean;
  multiple: boolean;
  label: string;
  onStep: (direction: -1 | 1) => void;
  children: ReactNode;
  previous: ReactNode;
  next: ReactNode;
}) {
  const swipeEnabled = multiple && !actualSize;
  const track = useRef<HTMLDivElement>(null);
  const animation = useRef<{ stop: () => void } | null>(null);
  const gesture = useRef<ReturnType<typeof createScreenshotSwipe> | null>(null);
  const settling = useRef(false);
  const x = useMotionValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    x.set(0);
    settling.current = false;
    const distance = () => (track.current?.offsetWidth ?? 0) + 24;
    function settle(direction: -1 | 0 | 1, velocity = 0) {
      animation.current?.stop();
      if (reduceMotion) {
        x.set(0);
        if (direction) onStep(direction);
        return;
      }
      if (!direction && x.get() === 0) return;
      settling.current = true;
      animation.current = animate(x, -direction * distance(), {
        type: "spring",
        stiffness: 380,
        damping: 38,
        mass: 0.8,
        velocity: Math.max(-1500, Math.min(1500, velocity * 1000)),
        restDelta: 0.5,
        onComplete: () => {
          settling.current = false;
          if (direction) onStep(direction);
        },
      });
    }
    gesture.current = createScreenshotSwipe({
      canSwipe: () =>
        swipeEnabled &&
        !settling.current &&
        (window.visualViewport?.scale ?? 1) <= 1,
      getWidth: distance,
      onDrag: (offset) =>
        x.set(Math.max(-distance(), Math.min(distance(), offset))),
      onStep: settle,
      onCancel: () => settle(0),
    });
    return () => {
      gesture.current = null;
      animation.current?.stop();
    };
  }, [swipeEnabled, onStep, reduceMotion, x]);

  return (
    <>
      <div
        className={`tututor-lightbox-image${actualSize ? " is-actual-size" : ""}`}
        data-swipe-enabled={swipeEnabled || undefined}
        tabIndex={0}
        role="region"
        aria-label={`${label}. ${actualSize ? "Scroll to explore at original size." : multiple ? "Swipe left or right to change screenshots." : "Full screenshot."}`}
        onTouchStart={(event) => gesture.current?.onTouchStart(event)}
        onTouchMove={(event) => gesture.current?.onTouchMove(event)}
        onTouchEnd={(event) => gesture.current?.onTouchEnd(event)}
        onTouchCancel={() => gesture.current?.onTouchCancel()}
      >
        {swipeEnabled ? (
          <motion.div ref={track} className="screenshot-track" style={{ x }}>
            <div
              className="screenshot-slide screenshot-slide-previous"
              aria-hidden="true"
              inert
            >
              {previous}
            </div>
            <div className="screenshot-slide">{children}</div>
            <div
              className="screenshot-slide screenshot-slide-next"
              aria-hidden="true"
              inert
            >
              {next}
            </div>
          </motion.div>
        ) : (
          children
        )}
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
