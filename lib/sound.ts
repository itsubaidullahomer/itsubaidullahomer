/**
 * The site's sound. A handful of short, quiet effects from one family (made with ElevenLabs Sound Effects,
 * picked and trimmed by hand, see public/sounds/v1), played through one Web Audio context.
 *
 * - Nothing is downloaded until sound is actually used, so it costs a page load nothing.
 * - Browsers only allow sound after the visitor has tapped or clicked, so the first gesture unlocks it.
 * - It is on by default and the bar has a switch; the visitor's choice is remembered on their device.
 * - On an iPhone it follows the silent switch and mixes with music instead of stopping it.
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
  whoosh: 0.22,
  success: 0.3,
  chime: 0.32,
  intro: 0.28,
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

let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let loading: Promise<void> | null = null;
let on = false;
let started = false;
/** True while the page glides to a section after a link: what passes by on the way stays quiet. */
let hushed = false;
let hushTimer: ReturnType<typeof setTimeout> | undefined;
const buffers = new Map<SoundName, AudioBuffer>();
const last = new Map<SoundName, number>();
const listeners = new Set<(on: boolean) => void>();

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

function context(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    // Mix with whatever the visitor is listening to, and stay quiet when an iPhone is on silent.
    const session = (navigator as unknown as { audioSession?: { type: string } }).audioSession;
    if (session) session.type = "ambient";
  } catch {
    // Not supported: the browser's default is fine.
  }
  ctx = new Ctor({ latencyHint: "interactive" });
  out = ctx.createGain();
  out.gain.value = 0.9;
  out.connect(ctx.destination);
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) void ctx.suspend();
    else if (on) void ctx.resume();
  });
  return ctx;
}

function load(): Promise<void> {
  const audio = ctx;
  if (!audio) return Promise.resolve();
  loading ??= Promise.all(
    NAMES.map(async (name) => {
      const response = await fetch(`${BASE}${name}.mp3`);
      buffers.set(name, await audio.decodeAudioData(await response.arrayBuffer()));
    }),
  ).then(
    () => undefined,
    () => undefined,
  );
  return loading;
}

/** Called on the visitor's first tap, click or key press: the moment the browser allows sound. */
function unlock() {
  if (!on) return;
  const audio = context();
  if (!audio) return;
  void audio.resume();
  void load();
}

/** Reads the visitor's choice and waits for their first gesture. Safe to call more than once. */
export function startSound() {
  if (started || typeof window === "undefined") return;
  started = true;
  on = stored();
  emit();
  const first = () => {
    unlock();
    for (const name of ["pointerdown", "keydown", "touchend"]) window.removeEventListener(name, first, true);
  };
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

/** The switch in the bar. Turning it on plays the chime once everything has loaded. */
export async function setSound(next: boolean) {
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
  await audio.resume();
  await load();
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

/** Plays a sound if sound is on and ready. Returns whether it played. */
export function play(
  name: SoundName,
  { rate = 1, gain = 1, delay = 0, force = false, ambient = false }: PlayOptions = {},
): boolean {
  if ((!on && !force) || (ambient && hushed) || !ctx || !out || ctx.state !== "running") return false;
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
  source.start(ctx.currentTime + delay);
  return true;
}
