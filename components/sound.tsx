"use client";

import { useEffect, useSyncExternalStore } from "react";
import { hush, onSoundChange, play, setScene, setSound, soundOn, startSound, type Scene } from "@/lib/sound";

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

/** The parts of the page the music follows (lib/sound.ts gives each its level and brightness). */
const SCENES: [selector: string, scene: Scene][] = [
  ["#top", "top"],
  ["#about", "about"],
  ["#services", "services"],
  ["#before-after", "compare"],
  ["#work", "work"],
  [".band", "band"],
  ["#process", "process"],
  ["#faq", "faq"],
  ["#contact", "contact"],
  [".footer", "footer"],
];

const HOVERABLE = "a, button, summary, [role='slider'], .svc, .piece__window, .pphone, .peek";
const PRESSABLE = "a, button, summary";

/**
 * Listens once, for the whole page, and gives the ordinary moments a sound: hovering, pressing, opening an
 * answer, choosing a service, jumping to a section, the contact panel arriving. A press sounds the instant
 * the mouse goes down (on a touch screen, when the tap lands, so scrolling never makes a sound). The moments
 * that belong to one component play their own: service cards arriving (Track), cards settling, numbers
 * counting, the before and after handle, copying the email, and the opening (lib/sound.ts). It also tells
 * the music which part of the page is in the middle of the screen.
 */
export function SoundEvents() {
  useEffect(() => {
    startSound();
    let hovered: Element | null = null;
    let pressed: Element | null = null;
    // When the page scrolls under a still mouse, things pass beneath it: that is not a hover.
    let scrolled = 0;
    const scroll = () => {
      scrolled = performance.now();
    };
    const quiet = (target: Element) => !!target.closest(".snd, .loader, [data-quiet]");

    const over = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const target = (event.target as Element | null)?.closest?.(HOVERABLE) ?? null;
      const still = performance.now() - scrolled < 180;
      if (target && target !== hovered && !still && !quiet(target)) play("hover");
      hovered = target;
    };

    const press = (target: Element) => {
      if (target.matches(".chip")) {
        // Higher when it is being switched on, lower when off.
        play("pop", { rate: target.getAttribute("aria-pressed") === "true" ? 0.84 : 1.12 });
      } else if (target.matches("summary")) {
        const open = (target.parentElement as HTMLDetailsElement | null)?.open;
        play("pop", { rate: open ? 0.82 : 1.08 });
      } else play("tap");
    };

    const down = (event: PointerEvent) => {
      if (event.pointerType === "touch" || event.button !== 0) return;
      const target = (event.target as Element | null)?.closest?.(PRESSABLE) ?? null;
      if (!target || quiet(target)) return;
      pressed = target;
      press(target);
    };

    const click = (event: MouseEvent) => {
      const target = (event.target as Element | null)?.closest?.(PRESSABLE) ?? null;
      if (!target || quiet(target)) return;
      // A mouse already sounded on the way down; a tap or a key sounds now.
      if (target !== pressed) press(target);
      pressed = null;
      if (target.matches("a[href^='#']")) {
        play("swish", { delay: 0.02 });
        hush();
      }
    };

    // The contact panel shimmers once, as soon as it starts to come up with sound ready.
    const panel = document.getElementById("contact");
    const shimmer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && play("intro", { ambient: true })) shimmer.disconnect();
      },
      { threshold: 0.12 },
    );
    if (panel) shimmer.observe(panel);

    // A line across the middle of the screen: whichever part of the page crosses it sets the music.
    const scenes = new Map<Element, Scene>();
    for (const [selector, scene] of SCENES) {
      const element = document.querySelector(selector);
      if (element) scenes.set(element, scene);
    }
    const middle = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const scene = scenes.get(entry.target);
          if (entry.isIntersecting && scene) setScene(scene);
        }
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    for (const element of scenes.keys()) middle.observe(element);

    window.addEventListener("scroll", scroll, { passive: true });
    document.addEventListener("pointerover", over, { passive: true });
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("scroll", scroll);
      document.removeEventListener("pointerover", over);
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("click", click, true);
      shimmer.disconnect();
      middle.disconnect();
    };
  }, []);
  return null;
}
