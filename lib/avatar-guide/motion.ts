import {
  EMOTIONS,
  VISEMES,
  type Emotion,
  type FaceWeights,
  type Vec3,
  type VisemeCue,
} from "./vocabulary";
export const clamp = (n: number, min = 0, max = 1) =>
  Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : min;
export const smooth = (n: number) => {
  const t = clamp(n);
  return t * t * (3 - 2 * t);
};
export const damp = (current: number, target: number, dt: number, rate = 10) =>
  current + (target - current) * (1 - Math.exp(-Math.max(0, dt) * rate));

export function seededRandom(seed: number) {
  let n = seed >>> 0;
  return () => {
    n += 0x6d2b79f5;
    let t = n;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Smooth aperiodic value noise; separate seeds keep joints from moving in lockstep. */
export function noise(time: number, seed = 1) {
  const i = Math.floor(time),
    f = smooth(time - i);
  const hash = (n: number) => {
    const x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453;
    return (x - Math.floor(x)) * 2 - 1;
  };
  return hash(i) * (1 - f) + hash(i + 1) * f;
}

const FACES: Record<Emotion, FaceWeights> = {
  neutral: {},
  warm_smile: {
    mouthSmileLeft: 0.38,
    mouthSmileRight: 0.33,
    cheekSquintLeft: 0.15,
    cheekSquintRight: 0.12,
  },
  big_laugh: {
    mouthSmileLeft: 0.9,
    mouthSmileRight: 0.85,
    cheekSquintLeft: 0.8,
    cheekSquintRight: 0.8,
    eyeSquintLeft: 0.5,
    eyeSquintRight: 0.5,
    jawOpen: 0.48,
  },
  playful: {
    mouthSmileLeft: 0.55,
    mouthSmileRight: 0.2,
    browOuterUpRight: 0.5,
  },
  proud: {
    mouthSmileLeft: 0.25,
    mouthSmileRight: 0.3,
    browOuterUpLeft: 0.12,
    browOuterUpRight: 0.12,
  },
  excited: {
    mouthSmileLeft: 0.6,
    mouthSmileRight: 0.65,
    eyeWideLeft: 0.3,
    eyeWideRight: 0.3,
    browInnerUp: 0.3,
  },
  curious: { browOuterUpLeft: 0.45, browInnerUp: 0.25, mouthPucker: 0.1 },
  thinking: {
    browDownLeft: 0.3,
    browOuterUpRight: 0.25,
    mouthPressLeft: 0.22,
    mouthPressRight: 0.18,
  },
  surprised: {
    browInnerUp: 0.75,
    browOuterUpLeft: 0.7,
    browOuterUpRight: 0.7,
    eyeWideLeft: 0.65,
    eyeWideRight: 0.65,
    jawOpen: 0.3,
  },
  serious: {
    browDownLeft: 0.25,
    browDownRight: 0.2,
    mouthPressLeft: 0.25,
    mouthPressRight: 0.25,
  },
  angry: {
    browDownLeft: 0.65,
    browDownRight: 0.65,
    noseSneerLeft: 0.25,
    noseSneerRight: 0.25,
    mouthPressLeft: 0.4,
    mouthPressRight: 0.4,
  },
  sad: {
    browInnerUp: 0.65,
    mouthFrownLeft: 0.5,
    mouthFrownRight: 0.45,
    eyeSquintLeft: 0.12,
    eyeSquintRight: 0.12,
  },
  embarrassed: {
    mouthSmileLeft: 0.24,
    mouthSmileRight: 0.12,
    browInnerUp: 0.22,
    cheekSquintLeft: 0.22,
    cheekSquintRight: 0.18,
  },
};
export function faceFor(
  emotion: Emotion,
  intensity: number,
  mouth: FaceWeights,
  blink: number,
) {
  const result: FaceWeights = {};
  const speech = clamp(
    Object.values(mouth).reduce((sum, value) => sum + clamp(value), 0),
  );
  for (const [name, value] of Object.entries(
    FACES[EMOTIONS.includes(emotion) ? emotion : "neutral"],
  ))
    result[name] =
      value *
      clamp(intensity) *
      (/^(jaw|mouth)/.test(name) ? 1 - speech * 0.85 : 1);
  Object.assign(result, mouth);
  result.eyeBlinkLeft = result.eyeBlinkRight = clamp(blink);
  return result;
}
export function validateVisemes(cues: readonly VisemeCue[]) {
  if (cues.length > 30000) throw new Error("Too many viseme cues.");
  let previous = 0;
  for (const cue of cues) {
    if (
      !VISEMES.includes(cue.value) ||
      !Number.isFinite(cue.start) ||
      !Number.isFinite(cue.end) ||
      cue.start < previous ||
      cue.end <= cue.start
    )
      throw new Error(
        "Visemes must be finite, ordered, non-overlapping cues in seconds.",
      );
    previous = cue.end;
  }
  return cues;
}
/** Samples genuine supplied phoneme alignment. No vowel guessing from volume or characters. */
export function mouthAt(
  cues: readonly VisemeCue[],
  seconds: number,
): FaceWeights {
  const result: FaceWeights = {};
  if (
    !Number.isFinite(seconds) ||
    seconds < 0 ||
    !cues.length ||
    seconds >= cues[cues.length - 1].end
  )
    return result;
  let low = 0,
    high = cues.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (cues[middle].end < seconds - 0.06) low = middle + 1;
    else high = middle;
  }
  for (let i = low; i < cues.length && cues[i].start <= seconds + 0.06; i++) {
    const cue = cues[i];
    if (cue.value === "sil") continue;
    result[`viseme_${cue.value}`] = clamp(
      Math.min(
        (seconds - cue.start + 0.06) / 0.12,
        (cue.end - seconds + 0.06) / 0.12,
      ),
    );
  }
  const total = Object.values(result).reduce((a, b) => a + b, 0);
  if (total > 1) for (const name of Object.keys(result)) result[name] /= total;
  return result;
}
export class IdleDirector {
  private rng: () => number;
  current = -1;
  next = 0;
  speed = 1;
  intensity = 0.5;
  constructor(seed = 781) {
    this.rng = seededRandom(seed);
  }
  update(seconds: number, choices = 6) {
    if (seconds < this.next) return false;
    const offset = 1 + Math.floor(this.rng() * Math.max(1, choices - 1));
    this.current = (this.current + offset + choices) % choices;
    this.speed = 0.9 + this.rng() * 0.2;
    this.intensity = 0.3 + this.rng() * 0.7;
    this.next = seconds + 4 + this.rng() * 6;
    return true;
  }
}
export class BlinkDirector {
  private rng: () => number;
  private next = 2;
  private start = -10;
  private double = false;
  constructor(seed = 282) {
    this.rng = seededRandom(seed);
  }
  sample(seconds: number) {
    if (seconds >= this.next) {
      this.start = seconds;
      const again = !this.double && this.rng() < 0.13;
      this.double = again;
      this.next = seconds + (again ? 0.32 : 2 + this.rng() * 4);
    }
    const phase = (seconds - this.start) / 0.19;
    return phase >= 0 && phase <= 1 ? Math.sin(Math.PI * phase) ** 2 : 0;
  }
}
const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scale = (a: Vec3, n: number): Vec3 => [a[0] * n, a[1] * n, a[2] * n];
const length = (a: Vec3) => Math.hypot(...a);
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/** Analytic two-link solution with a stable elbow pole and a clamped reachable target. */
export function solveArm(
  shoulder: Vec3,
  target: Vec3,
  upper: number,
  lower: number,
  pole: Vec3,
) {
  if (upper <= 0 || lower <= 0)
    throw new Error("Arm lengths must be positive.");
  const delta = sub(target, shoulder),
    distance = length(delta);
  const direction: Vec3 =
    distance > 0.00001 ? scale(delta, 1 / distance) : [1, 0, 0];
  const reach = clamp(
    distance,
    Math.abs(upper - lower) + 0.0001,
    upper + lower - 0.0001,
  );
  const along = (upper * upper - lower * lower + reach * reach) / (2 * reach);
  let perpendicular = sub(pole, scale(direction, dot(pole, direction)));
  if (length(perpendicular) < 0.00001) {
    const alt: Vec3 = Math.abs(direction[1]) < 0.9 ? [0, 1, 0] : [0, 0, 1];
    perpendicular = sub(alt, scale(direction, dot(alt, direction)));
  }
  perpendicular = scale(perpendicular, 1 / length(perpendicular));
  const elbow = add(
    shoulder,
    add(
      scale(direction, along),
      scale(
        perpendicular,
        Math.sqrt(Math.max(0, upper * upper - along * along)),
      ),
    ),
  );
  return {
    elbow,
    wrist: add(shoulder, scale(direction, reach)),
    clamped: distance > reach + 0.001,
  };
}
