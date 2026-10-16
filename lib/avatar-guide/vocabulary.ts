export const EMOTIONS = [
  "neutral",
  "warm_smile",
  "big_laugh",
  "playful",
  "proud",
  "excited",
  "curious",
  "thinking",
  "surprised",
  "serious",
  "angry",
  "sad",
  "embarrassed",
] as const;
export const GESTURES = [
  "wave",
  "open_palm_present",
  "welcome_open_arms",
  "shrug",
  "count_on_fingers",
  "beat_small",
  "beat_big",
  "hand_to_chin",
  "arms_crossed",
  "thumbs_up",
  "nod",
  "head_shake",
  "head_tilt",
  "laugh_body",
] as const;
export const STATES = [
  "idle",
  "listening",
  "thinking",
  "speaking",
  "navigating",
  "pointing",
  "interrupted",
] as const;
export const VISEMES = [
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
  "I",
  "O",
  "U",
] as const;
export type Emotion = (typeof EMOTIONS)[number];
export type Gesture = (typeof GESTURES)[number];
export type AvatarState = (typeof STATES)[number];
export type Viseme = (typeof VISEMES)[number];
export type Vec3 = [number, number, number];
export type FaceWeights = Record<string, number>;
export type Target = {
  sectionId: string;
  selector: string;
  title: string;
  summary: string;
  keyFacts?: string[];
  path?: string;
};
export type VisemeCue = { start: number; end: number; value: Viseme };
export type WordTiming = { word: string; start: number; end: number };
export type SpeechOptions = {
  timingQuality?:
    "aligned" | "character-timed-phoneme-estimates" | "duration-estimates";
  emotion?: Emotion;
  intensity?: number;
  audioUrl?: string;
  visemes?: VisemeCue[];
  wordTimings?: WordTiming[];
  scenes?: {
    start: number;
    end: number;
    text: string;
    emotion: Emotion;
    state: AvatarState;
    gesture?: Gesture;
  }[];
  gestures?: { atWord: number; name: Gesture }[];
};
export type GuideSnapshot = {
  state: AvatarState;
  emotion: Emotion;
  intensity: number;
  caption: string;
  word: number;
  gesture: Gesture | null;
  target: string | null;
  muted: boolean;
  speechKind: "none" | "browser-demo" | "audio" | "captions";
  audioStartedAt: number | null;
  timingQuality: SpeechOptions["timingQuality"] | null;
};
export type GuideStatus = {
  state: "loading" | "ready" | "error";
  message: string;
  bones?: number;
  shapes?: number;
  clips?: number;
  missing?: string[];
};
export type AvatarGuideHandle = {
  lookAt(target: "viewer" | "cursor" | string): void;
  pointAt(selector: string): boolean;
  navigateTo(sectionId: string): Promise<boolean>;
  say(text: string, options?: SpeechOptions): Promise<void>;
  setEmotion(name: Emotion, intensity?: number): void;
  playGesture(name: Gesture): void;
  setState(state: AvatarState): void;
  inspectFace(weights: FaceWeights): void;
  interrupt(): void;
};
