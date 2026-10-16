"use client";

import Image from "next/image";
import { ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

export function CompareSlider() {
  const [position, setPosition] = useState(50);
  const [pageProgress, setPageProgress] = useState(0);
  const view = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; position: number; width: number } | null>(
    null,
  );
  const helpId = useId();

  function moveDivider(event: PointerEvent<HTMLButtonElement>) {
    if (
      !event.currentTarget.hasPointerCapture(event.pointerId) ||
      !drag.current
    )
      return;
    const start = drag.current;
    setPosition(
      Math.round(
        Math.max(
          0,
          Math.min(
            100,
            start.position + ((event.clientX - start.x) / start.width) * 100,
          ),
        ),
      ),
    );
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || !event.isPrimary || !view.current) return;
    event.preventDefault();
    drag.current = {
      x: event.clientX,
      position,
      width: view.current.getBoundingClientRect().width,
    };
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function endDrag(event: PointerEvent<HTMLButtonElement>) {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const delta = event.shiftKey ? 10 : 5;
    const values: Record<string, number> = {
      ArrowLeft: position - delta,
      ArrowDown: position - delta,
      ArrowRight: position + delta,
      ArrowUp: position + delta,
      PageDown: position - 20,
      PageUp: position + 20,
      Home: 0,
      End: 100,
    };
    if (!(event.key in values)) return;
    event.preventDefault();
    setPosition(Math.max(0, Math.min(100, values[event.key])));
  }

  return (
    <figure className="compare-stage">
      <div className="compare-heading" aria-hidden="true">
        <span>
          <i /> Before
        </span>
        <span className="compare-heading-after">
          After <i />
        </span>
      </div>
      <div className="compare-device">
        <div className="compare-device-top" aria-hidden="true">
          <i />
          <b />
        </div>
        <div className="compare-view" ref={view}>
          <Image
            src="/images/ali-foodies/compare/before-home.jpg"
            alt="Before: Ali Foodies’ previous website"
            fill
            sizes="(max-width: 540px) 240px, 270px"
            draggable={false}
            style={{ objectPosition: `50% ${pageProgress * 100}%` }}
          />
          <div
            className="compare-after"
            style={{ clipPath: `inset(0 0 0 ${position}%)` }}
          >
            <Image
              src="/images/ali-foodies/compare/after-home.jpg"
              alt="After: Ali Foodies’ mobile redesign"
              fill
              sizes="(max-width: 540px) 240px, 270px"
              draggable={false}
              style={{ objectPosition: `50% ${pageProgress * 100}%` }}
            />
          </div>
          <div
            className="compare-scroll"
            role="region"
            aria-label="Scroll both Ali Foodies website previews"
            tabIndex={0}
            onScroll={(event) => {
              const { scrollTop, scrollHeight, clientHeight } =
                event.currentTarget;
              setPageProgress(
                Math.max(
                  0,
                  Math.min(
                    1,
                    scrollTop / Math.max(1, scrollHeight - clientHeight),
                  ),
                ),
              );
            }}
          >
            {/* One native scroll surface drives both images by the same page percentage. */}
            <div className="compare-scroll-space" />
          </div>
          <div
            className="compare-divider"
            style={{ left: `${position}%` }}
            aria-hidden="true"
          />
          <button
            type="button"
            role="slider"
            className="compare-handle"
            aria-label="Before and after comparison divider"
            aria-describedby={helpId}
            aria-orientation="horizontal"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={position}
            aria-valuetext={`${position}% before, ${100 - position}% after`}
            style={{ left: `clamp(23px, ${position}%, calc(100% - 23px))` }}
            onPointerDown={startDrag}
            onPointerMove={moveDivider}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onKeyDown={onKeyDown}
          >
            <ChevronLeft size={16} aria-hidden="true" />
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="compare-device-bottom" aria-hidden="true">
          <i />
        </div>
      </div>
      <div
        className="compare-presets"
        role="group"
        aria-label="Comparison view"
      >
        {[
          { label: "Before", value: 100 },
          { label: "Split", value: 50 },
          { label: "After", value: 0 },
        ].map(({ label, value }) => (
          <button
            key={label}
            type="button"
            aria-pressed={position === value}
            onClick={() => setPosition(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <figcaption id={helpId} className="compare-instructions">
        <span>Drag the arrows to compare.</span>
        <span>
          <ArrowDown size={11} aria-hidden="true" /> Scroll the phone to
          explore.
        </span>
        <span className="sr-only">
          Use the left and right arrow keys to move the divider. Home shows the
          redesign; End shows the previous site.
        </span>
      </figcaption>
    </figure>
  );
}
