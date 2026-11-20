/**
 * The site's sound. A handful of short, quiet effects from one family (made with ElevenLabs Sound Effects,
 * picked and trimmed by hand, see public/sounds/v1), played through one Web Audio context.
 *
 * - The files start downloading before the page paints (lib/opening.ts) and are decoded as soon as this
 *   script runs, before anyone has touched anything, so every sound is ready the moment it is allowed.
 * - Browsers only allow sound once the visitor has tapped or clicked. On a first visit that is the curtain's
 *   Enter button (the opening itself is played by lib/opening.ts, so it never waits for this script);
 *   otherwise their first tap or click, which makes its own sound straight away.
 * - Each sound starts at its first audible sample, so it lands exactly on the action.
 * - On by default, with a switch in the bar; the choice is remembered on the visitor's device. On an iPhone
 *   it follows the silent switch and mixes with music instead of stopping it.
 * - Small effects vary their pitch slightly each time, so repeats never sound mechanical.
 */

export type SoundName = "tap" | "hover" | "pop" | "whoosh" | "land" | "chime" | "success" | "tick" | "intro";

const NAMES: SoundName[] = ["tap", "hover", "pop", "whoosh", "land", "chime", "success", "tick", "intro"];
const BASE = "/sounds/v1/";

/** Sound is on until the visitor turns it off. Set to false to make it opt-in. */
const DEFAULT_ON = true;

/** How loud each one sits in the mix (the files are all levelled to the same peak). */
const MIX: Record<SoundName, number> = {
  hover: 0.09,
  tick: 0.1,
  tap: 0.3,
  pop: 0.26,
  land: 0.22,
  whoosh: 0.24,
  success: 0.3,
  chime: 0.32,
  intro: 0.3,
};
/** The shortest gap between two plays of the same sound, in ms, so a fast hand never makes a buzz. */
const GAP: Record<SoundName, number> = {
  hover: 70,
  tick: 40,
  tap: 40,
  pop: 45,
  land: 120,
  whoosh: 280,
  success: 400,
  chime: 600,
  intro: 3000,
};
const VARY = new Set<SoundName>(["hover", "tick", "tap", "pop", "land"]);

type Opening = { at: number; sound: boolean };
type SoundWindow = Window & {
  __sfx?: Partial<Record<SoundName, Promise<ArrayBuffer | null>>>;
  __ac?: AudioContext;
  __entered?: Opening;
  webkitAudioContext?: typeof AudioContext;
};

let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let on = false;
let started = false;
/** The visitor has made a gesture, so the context may be running or about to run. */
let unlocked = false;
/** True while the page glides to a section after a link: what passes by on the way stays quiet. */
let hushed = false;
let hushTimer: ReturnType<typeof setTimeout> | undefined;
const buffers = new Map<SoundName, AudioBuffer>();
/** Where each sound's first audible sample is, in seconds, so playback skips any silence in front. */
const onsets = new Map<SoundName, number>();
const last = new Map<SoundName, number>();
const listeners = new Set<(on: boolean) => void>();

const win = () => window as SoundWindow;

function stored(): boolean {
  try {
    const value = localStorage.getItem("sound");
    return value ? value === "on" : DEFAULT_ON;
  } catch {
    return DEFAULT_ON;
  }
}
function store(value: boolean) {
  try {
    localStorage.setItem("sound", value ? "on" : "off");
  } catch {
    // Private mode: the choice lasts for this visit only.
  }
}
function emit() {
  for (const listener of listeners) listener(on);
}

/** The live audio context: the one the curtain opened, or a new one. Only ever created inside a gesture. */
function context(): AudioContext | null {
  if (!ctx) {
    const w = win();
    if (w.__ac) ctx = w.__ac;
    else {
      const Ctor = window.AudioContext ?? w.webkitAudioContext;
      if (!Ctor) return null;
      try {
        // Mix with whatever the visitor is listening to, and stay quiet when an iPhone is on silent.
        const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
        if (session) session.type = "ambient";
      } catch {
        // Not supported: the browser's default is fine.
      }
      ctx = new Ctor({ latencyHint: "interactive" });
      w.__ac = ctx;
    }
    out = ctx.createGain();
    out.gain.value = 0.9;
    out.connect(ctx.destination);
    document.addEventListener("visibilitychange", () => {
      if (!ctx) return;
      if (document.hidden) void ctx.suspend();
      else if (on && unlocked) void ctx.resume();
    });
  }
  return ctx;
}

/** Decodes every sound without waiting for a gesture (an offline context needs no permission). */
async function prepare() {
  const w = win();
  const Offline = window.OfflineAudioContext;
  if (!Offline) return;
  const decoder = new Offline(1, 1, 44100);
  await Promise.all(
    NAMES.map(async (name) => {
      try {
        const data = (await w.__sfx?.[name]) ?? (await (await fetch(`${BASE}${name}.mp3`)).arrayBuffer());
        if (!data) return;
        const buffer = await decoder.decodeAudioData(data.slice(0));
        const samples = buffer.getChannelData(0);
        let peak = 0;
        for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
        let first = 0;
        while (first < samples.length && Math.abs(samples[first]) < peak * 0.02) first++;
        buffers.set(name, buffer);
        onsets.set(name, Math.max(0, first / buffer.sampleRate - 0.002));
      } catch {
        // One missing sound never stops the rest.
      }
    }),
  );
}

/** The visitor's first tap, click or key press: the moment a browser allows sound. */
function unlock() {
  if (unlocked || !on) return;
  const audio = context();
  if (!audio) return;
  unlocked = true;
  void audio.resume();
}

/** The visitor came in through the curtain (lib/opening.ts has already played the opening). */
function entered(detail: Opening) {
  on = detail.sound;
  if (on) {
    context();
    unlocked = true;
  }
  emit();
}

/** Reads the visitor's choice, decodes the sounds and waits for the first gesture. Safe to call twice. */
export function startSound() {
  if (started || typeof window === "undefined") return;
  started = true;
  on = stored();
  emit();
  void prepare();
  const w = win();
  if (w.__entered) {
    // The visitor pressed Enter before this script arrived: pick up where the curtain left off.
    if (w.__entered.sound && w.__ac) {
      context();
      unlocked = true;
    }
    entered(w.__entered);
  } else {
    window.addEventListener("enter", (event) => entered((event as CustomEvent<Opening>).detail), { once: true });
  }
  const first = () => unlock();
  for (const name of ["pointerdown", "keydown", "touchend"]) window.addEventListener(name, first, true);
}

export function soundOn() {
  return on;
}

export function onSoundChange(listener: (on: boolean) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The switch in the bar. Turning it on plays the chime. */
export function setSound(next: boolean) {
  if (!next) {
    play("pop", { rate: 0.8, force: true });
    on = false;
    store(false);
    emit();
    return;
  }
  on = true;
  store(true);
  emit();
  const audio = context();
  if (!audio) return;
  unlocked = true;
  void audio.resume();
  play("chime");
}

/**
 * Quiet the background sounds (counters, cards arriving, the contact shimmer) while the page glides to a
 * section, so a jump does not set off everything it passes. Ends when the scroll does.
 */
export function hush() {
  hushed = true;
  const release = () => {
    hushed = false;
    clearTimeout(hushTimer);
    window.removeEventListener("scrollend", release);
  };
  clearTimeout(hushTimer);
  hushTimer = setTimeout(release, 1800);
  window.addEventListener("scrollend", release, { once: true });
}

type PlayOptions = {
  /** 1 is the recorded pitch; 2 is an octave up. */
  rate?: number;
  /** Multiplies the sound's place in the mix. */
  gain?: number;
  /** Seconds from now. */
  delay?: number;
  /** Play even though sound is off (only the "off" click itself). */
  force?: boolean;
  /** A background sound, not an answer to a click: skipped while the page glides to a section. */
  ambient?: boolean;
};

/** Plays a sound if sound is on and allowed. Returns whether it played. */
export function play(
  name: SoundName,
  { rate = 1, gain = 1, delay = 0, force = false, ambient = false }: PlayOptions = {},
): boolean {
  if ((!on && !force) || (ambient && hushed) || !unlocked || !ctx || !out) return false;
  // A context that is still waking from the gesture that unlocked it plays as soon as it is up.
  if (ctx.state === "closed" || (ctx.state === "suspended" && document.hidden)) return false;
  const buffer = buffers.get(name);
  if (!buffer) return false;
  // Spacing is measured at the moment each sound will actually start, so a planned run of notes plays in full.
  const at = performance.now() + delay * 1000;
  if (Math.abs(at - (last.get(name) ?? -1e9)) < GAP[name]) return false;
  last.set(name, at);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = rate * (VARY.has(name) ? 1 + (Math.random() - 0.5) * 0.06 : 1);
  const level = ctx.createGain();
  level.gain.value = MIX[name] * gain;
  source.connect(level).connect(out);
  source.start(ctx.currentTime + delay, onsets.get(name) ?? 0);
  return true;
}
