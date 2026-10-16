import type { Expression } from "./expressions";

export const visemes = [
  "sil",
  "PP",
  "FF",
  "TH",
  "DD",
  "kk",
  "CH",
  "SS",
  "nn",
  "RR",
  "aa",
  "E",
  "ih",
  "oh",
  "ou",
] as const;
export type Viseme = (typeof visemes)[number];
export type AvatarExpression = "neutral" | Expression;
export type FaceWeights = Record<string, number>;
export type MouthCue = { start: number; end: number; value: Viseme };

const expressionPoses: Record<AvatarExpression, FaceWeights> = {
  neutral: {},
  warm: {
    mouthSmileLeft: 0.35,
    mouthSmileRight: 0.35,
    cheekSquintLeft: 0.1,
    cheekSquintRight: 0.1,
  },
  amused: {
    mouthSmileLeft: 0.55,
    mouthSmileRight: 0.35,
    browOuterUpLeft: 0.12,
  },
  thinking: {
    browInnerUp: 0.18,
    browDownRight: 0.18,
    mouthPressLeft: 0.1,
    mouthPressRight: 0.1,
  },
  raised_eyebrow: {
    browOuterUpLeft: 0.65,
    browDownRight: 0.12,
    mouthSmileRight: 0.15,
  },
  focused: {
    browDownLeft: 0.18,
    browDownRight: 0.18,
    eyeSquintLeft: 0.08,
    eyeSquintRight: 0.08,
  },
  laughing: {
    mouthSmileLeft: 0.7,
    mouthSmileRight: 0.7,
    cheekSquintLeft: 0.3,
    cheekSquintRight: 0.3,
    jawOpen: 0.22,
  },
};

export const clampWeight = (value: number) =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

/** Expression, speech and blink are independent layers. Speech owns the jaw. */
export function composeFace(
  expression: AvatarExpression,
  intensity: number,
  mouth: FaceWeights = {},
  blink = 0,
): FaceWeights {
  const pose: FaceWeights = {};
  const speech = Math.min(
    1,
    Object.values(mouth).reduce((sum, value) => sum + clampWeight(value), 0),
  );
  for (const [name, value] of Object.entries(expressionPoses[expression])) {
    const lowerFace = name.startsWith("mouth") || name.startsWith("jaw");
    pose[name] = value * clampWeight(intensity) * (lowerFace ? 1 - speech : 1);
  }
  for (const [name, value] of Object.entries(mouth))
    pose[name] = clampWeight(value);
  pose.eyeBlinkLeft = clampWeight(blink);
  pose.eyeBlinkRight = clampWeight(blink);
  return pose;
}

export function validateCues(value: unknown): MouthCue[] {
  if (!Array.isArray(value) || value.length > 20_000)
    throw new Error("Expected an array of timed mouth cues.");
  let end = 0;
  return value.map((cue: unknown) => {
    if (!cue || typeof cue !== "object") throw new Error("Invalid mouth cue.");
    const c = cue as Record<string, unknown>;
    if (
      typeof c.start !== "number" ||
      typeof c.end !== "number" ||
      !Number.isFinite(c.start) ||
      !Number.isFinite(c.end) ||
      c.start < end ||
      c.end <= c.start ||
      !visemes.includes(c.value as Viseme)
    ) {
      throw new Error(
        "Cues need ordered, non-overlapping start/end times in seconds and a supported viseme.",
      );
    }
    end = c.end;
    return { start: c.start, end: c.end, value: c.value as Viseme };
  });
}

/** Sample against audio.currentTime; never estimate speech timing from render frames. */
export function sampleMouth(
  cues: readonly MouthCue[],
  seconds: number,
): FaceWeights {
  if (
    !Number.isFinite(seconds) ||
    seconds < 0 ||
    !cues.length ||
    seconds >= cues[cues.length - 1].end
  )
    return {};
  const fade = 0.045;
  const weights: FaceWeights = {};
  // Binary search keeps long utterances cheap and also supports seeking backwards.
  let lo = 0,
    hi = cues.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (cues[mid].end < seconds - fade) lo = mid + 1;
    else hi = mid;
  }
  for (let i = lo; i < cues.length && cues[i].start < seconds + fade; i++) {
    const cue = cues[i];
    if (cue.value === "sil") continue;
    const weight = clampWeight(
      Math.min(
        (seconds - cue.start + fade) / (2 * fade),
        (cue.end + fade - seconds) / (2 * fade),
      ),
    );
    const name = `viseme_${cue.value}`;
    weights[name] = Math.max(weights[name] ?? 0, weight);
  }
  const sum = Object.values(weights).reduce((total, value) => total + value, 0);
  if (sum > 1) for (const name of Object.keys(weights)) weights[name] /= sum;
  return weights;
}

/** Reject late chunks from an interrupted utterance. A new start replaces the old track. */
export class SpeechTrack {
  private id: string | null = null;
  private cues: MouthCue[] = [];

  start(id: string, cues: unknown) {
    const checked = validateCues(cues);
    this.id = id;
    this.cues = checked;
  }
  replace(id: string, cues: unknown) {
    if (id !== this.id) return false;
    this.cues = validateCues(cues);
    return true;
  }
  cancel() {
    this.id = null;
    this.cues = [];
  }
  sample(id: string, seconds: number, playing: boolean) {
    return playing && id === this.id ? sampleMouth(this.cues, seconds) : {};
  }
}
