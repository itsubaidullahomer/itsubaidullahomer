"use client";

import { useEffect, useSyncExternalStore } from "react";
import { hush, onSoundChange, play, setSound, soundOn, startSound } from "@/lib/sound";

/** The switch in the bar: four little bars that dance while sound is on and lie flat when it is off. */
export function SoundToggle() {
  // Off in the server's HTML; the visitor's own choice once the page is running.
  const on = useSyncExternalStore(onSoundChange, soundOn, () => false);
  useEffect(() => startSound(), []);
  return (
    <button
      type="button"
      className="snd"
      data-on={on || undefined}
      aria-pressed={on}
      aria-label="Sound effects"
      title={on ? "Sound on" : "Sound off"}
      onClick={() => void setSound(!on)}
    >
      <span className="snd__bars" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="snd__label" aria-hidden="true">
        {on ? "Sound on" : "Sound off"}
      </span>
    </button>
  );
}

/** Notes of a major scale, as playback rates: each service card that arrives plays the next one up. */
const SCALE = [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3];

const HOVERABLE = "a, button, summary, [role='slider'], .svc, .piece__window, .pphone, .peek";

/**
 * Listens once, for the whole page, and gives the ordinary moments a sound: hovering, clicking, opening an
 * answer, choosing a service, jumping to a section, the service cards and the contact panel arriving. The
 * moments that belong to one component (cards settling, numbers counting, the before and after handle,
 * copying the email) play their own, from that component.
 */
export function SoundEvents() {
  useEffect(() => {
    startSound();
    let hovered: Element | null = null;
    // When the page scrolls under a still mouse, things pass beneath it: that is not a hover.
    let scrolled = 0;
    const scroll = () => {
      scrolled = performance.now();
    };

    const over = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const target = (event.target as Element | null)?.closest?.(HOVERABLE) ?? null;
      const still = performance.now() - scrolled < 180;
      if (target && target !== hovered && !still && !target.closest(".snd")) play("hover");
      hovered = target;
    };

    const click = (event: MouseEvent) => {
      const target = (event.target as Element | null)?.closest?.("a, button, summary") ?? null;
      if (!target || target.closest(".snd, [data-quiet]")) return;
      if (target.matches(".chip")) {
        // Higher when it is being switched on, lower when off.
        play("pop", { rate: target.getAttribute("aria-pressed") === "true" ? 0.84 : 1.12 });
        return;
      }
      if (target.matches("summary")) {
        const open = (target.parentElement as HTMLDetailsElement | null)?.open;
        play("pop", { rate: open ? 0.82 : 1.08 });
        return;
      }
      play("tap");
      if (target.matches("a[href^='#']")) {
        play("whoosh", { delay: 0.07 });
        hush();
      }
    };

    // The service cards each play the next note as they arrive; the contact panel shimmers once.
    const cards = Array.from(document.querySelectorAll(".svc"));
    let batch = 0;
    const arrive = new IntersectionObserver(
      (entries) => {
        batch = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = cards.indexOf(entry.target);
          // Each card sings once, the first time it is seen with sound ready.
          if (play("pop", { rate: SCALE[index % SCALE.length] * 1.05, gain: 0.7, delay: batch * 0.09, ambient: true })) {
            batch++;
            arrive.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.45 },
    );
    for (const card of cards) arrive.observe(card);

    const panel = document.getElementById("contact");
    const shimmer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && play("intro", { ambient: true })) shimmer.disconnect();
      },
      { threshold: 0.35 },
    );
    if (panel) shimmer.observe(panel);

    window.addEventListener("scroll", scroll, { passive: true });
    document.addEventListener("pointerover", over, { passive: true });
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("scroll", scroll);
      document.removeEventListener("pointerover", over);
      document.removeEventListener("click", click, true);
      arrive.disconnect();
      shimmer.disconnect();
    };
  }, []);
  return null;
}
