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
 * - Under it all, a quiet music loop that follows the visitor down the page (see SCENES).
 */

export type SoundName =
  | "tap"
  | "hover"
  | "pop"
  | "whoosh"
  | "swish"
  | "note"
  | "chime"
  | "success"
  | "tick"
  | "intro";

const NAMES: SoundName[] = ["tap", "hover", "pop", "whoosh", "swish", "note", "chime", "success", "tick", "intro"];
const BASE = "/sounds/v1/";

/** Sound is on until the visitor turns it off. Set to false to make it opt-in. */
const DEFAULT_ON = true;

/** How loud each one sits in the mix (the files are all levelled to the same peak). */
const MIX: Record<SoundName, number> = {
  hover: 0.09,
  tick: 0.1,
  tap: 0.3,
  pop: 0.26,
  whoosh: 0.24,
  swish: 0.22,
  note: 0.2,
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
  whoosh: 280,
  swish: 280,
  note: 90,
  success: 400,
  chime: 600,
  intro: 3000,
};
const VARY = new Set<SoundName>(["hover", "tick", "tap", "pop"]);
/** Notes that arrive together are spread into a quick run instead of being dropped. */
const SPREAD = new Set<SoundName>(["note"]);

/**
 * Notes of a C major scale as playback rates (the note file is a C, like the chime and the music), so
 * things that arrive one after another climb a scale.
 */
export const SCALE = [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 15 / 8, 2];

/**
 * The music: one calm loop under the whole site (public/sounds/v1/music.*), in C major like everything
 * else. Each part of the page has its own level and brightness (a gain and a low-pass filter), and the
 * music glides between them as the visitor scrolls: open and full for the work and the big type, softer
 * while reading the questions or using the before and after, warm again for the contact panel.
 */
const MUSIC_LEVEL = 0.2;
/**
 * The file holds 51.2 seconds of music (16 bars at 75 BPM) with half a second of its own end before it and
 * of its start after it, so the loop points sit inside continuous music. That keeps the loop seamless even
 * where a browser's decoder shifts the audio by a few milliseconds.
 */
const MUSIC_LOOP = [0.5, 51.7] as const;
export type Scene = "top" | "about" | "services" | "compare" | "work" | "band" | "process" | "faq" | "contact" | "footer";
const SCENES: Record<Scene, [level: number, brightness: number]> = {
  top: [0.8, 2600],
  about: [0.7, 1900],
  services: [0.85, 4200],
  compare: [0.6, 1700],
  work: [1, 9000],
  band: [1, 14000],
  process: [0.75, 3400],
  faq: [0.5, 1300],
  contact: [0.9, 6500],
  footer: [0.6, 2200],
};

type Opening = { at: number; sound: boolean };
type SoundWindow = Window & {
  __sfx?: Partial<Record<SoundName, Promise<ArrayBuffer | null>>>;
  __ac?: AudioContext;
  __entered?: Opening;
  webkitAudioContext?: typeof AudioContext;
};

let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let musicBuffer: AudioBuffer | null = null;
let musicLoad: Promise<void> | null = null;
let music: { source: AudioBufferSourceNode; filter: BiquadFilterNode; level: GainNode } | null = null;
let scene: Scene = "top";
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
  startMusic();
}

/** The visitor came in through the curtain (lib/opening.ts has already played the opening). */
function entered(detail: Opening) {
  on = detail.sound;
  if (on) {
    context();
    unlocked = true;
    startMusic();
  }
  emit();
}

/** A visitor saving data, or on a very slow connection, gets the effects without the music. */
function frugal() {
  const connection = (navigator as unknown as { connection?: { saveData?: boolean; effectiveType?: string } })
    .connection;
  return !!connection && (connection.saveData === true || /2g/.test(connection.effectiveType ?? ""));
}

/** Downloads and decodes the music once, quietly, after the page itself has finished loading. */
function loadMusic() {
  if (frugal()) return;
  musicLoad ??= (async () => {
    const Offline = window.OfflineAudioContext;
    if (!Offline) return;
    // 32 kHz is plenty for a soft background and keeps the decoded loop small in memory.
    const decoder = new Offline(2, 1, 32000);
    const opus = new Audio().canPlayType('audio/webm; codecs="opus"') !== "";
    for (const type of opus ? ["webm", "mp3"] : ["mp3"]) {
      try {
        const response = await fetch(`${BASE}music.${type}`, { priority: "low" } as RequestInit);
        if (!response.ok) continue;
        musicBuffer = await decoder.decodeAudioData(await response.arrayBuffer());
        break;
      } catch {
        // Try the other format.
      }
    }
    startMusic();
  })().catch(() => undefined);
}

/** Starts the loop if sound is on and allowed, fading in over a few seconds. */
function startMusic() {
  if (!on || !unlocked || !ctx || !out || music) return;
  if (!musicBuffer) {
    loadMusic();
    return;
  }
  const source = ctx.createBufferSource();
  source.buffer = musicBuffer;
  source.loop = true;
  [source.loopStart, source.loopEnd] = MUSIC_LOOP;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 0.5;
  const level = ctx.createGain();
  level.gain.value = 0;
  source.connect(filter).connect(level).connect(out);
  const [gain, brightness] = SCENES[scene];
  filter.frequency.value = brightness;
  level.gain.setTargetAtTime(gain * MUSIC_LEVEL, ctx.currentTime + 0.05, 1.1);
  source.start(ctx.currentTime, MUSIC_LOOP[0]);
  music = { source, filter, level };
}

function stopMusic() {
  if (!music || !ctx) return;
  music.level.gain.setTargetAtTime(0, ctx.currentTime, 0.12);
  music.source.stop(ctx.currentTime + 0.7);
  music = null;
}

/** The part of the page in the middle of the screen: the music glides to its level and brightness. */
export function setScene(next: Scene) {
  scene = next;
  if (!music || !ctx) return;
  const [gain, brightness] = SCENES[next];
  music.level.gain.setTargetAtTime(gain * MUSIC_LEVEL, ctx.currentTime, 0.7);
  music.filter.frequency.setTargetAtTime(brightness, ctx.currentTime, 0.9);
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
  // The music never competes with the page: it downloads once the visitor has chosen sound (Enter, the
  // switch, or a first tap with sound on), or, for someone who chose it on an earlier visit, as soon as
  // everything else has loaded, so it is ready for their first tap.
  const later = () => {
    let chosen = false;
    try {
      chosen = localStorage.getItem("sound") === "on";
    } catch {
      // No storage: wait for the first tap.
    }
    if (on && chosen) loadMusic();
  };
  if (document.readyState === "complete") later();
  else window.addEventListener("load", later, { once: true });
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
    stopMusic();
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
  startMusic();
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
  let at = performance.now() + delay * 1000;
  const previous = last.get(name) ?? -1e9;
  if (Math.abs(at - previous) < GAP[name]) {
    // Notes that land together become a quick run, one after another (never a long queue).
    if (!SPREAD.has(name) || previous + GAP[name] - at > 500) return false;
    at = previous + GAP[name];
    delay = (at - performance.now()) / 1000;
  }
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
