import {
  composeFace,
  type AvatarExpression,
  type FaceWeights,
  type MouthCue,
  sampleMouth,
} from "./rig";

export type ConversationChapter = {
  start: number;
  end: number;
  speechEnd: number;
  label: string;
  expression: string;
  text: string;
};
export type ConversationPose = {
  face: FaceWeights;
  rotation: [number, number, number];
  gaze: [number, number];
};
const smooth = (t: number) => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};
export function chapterAt(
  chapters: readonly ConversationChapter[],
  seconds: number,
) {
  return chapters.findIndex((c) => seconds >= c.start && seconds < c.end);
}
/** Audio time owns speech, expression, gaze and nods, so pause/seek freeze the whole performance. */
export function sampleConversation(
  chapters: readonly ConversationChapter[],
  cues: readonly MouthCue[],
  seconds: number,
): ConversationPose {
  const rest: ConversationPose = {
    face: {},
    rotation: [0, 0, 0],
    gaze: [0, 0],
  };
  if (!Number.isFinite(seconds) || seconds < 0) return rest;
  const index = chapterAt(chapters, seconds);
  if (index < 0) return rest;
  const chapter = chapters[index];
  const local = seconds - chapter.start;
  const envelope = smooth(local / 1.2);
  const current = composeFace(chapter.expression as AvatarExpression, 0.85);
  const previous = composeFace(
    chapters[Math.max(0, index - 1)].expression as AvatarExpression,
    0.85,
  );
  const face: FaceWeights = {};
  for (const key of new Set([
    ...Object.keys(current),
    ...Object.keys(previous),
  ]))
    face[key] =
      (previous[key] ?? 0) * (1 - envelope) + (current[key] ?? 0) * envelope;
  const speaking = chapter.text.length > 0 && seconds < chapter.speechEnd;
  const mouth = speaking ? sampleMouth(cues, seconds) : {};
  const speechEnvelope =
    smooth(local / 0.18) * smooth((chapter.speechEnd - seconds) / 0.18);
  for (const key of Object.keys(mouth)) mouth[key] *= speechEnvelope;
  const motionEnvelope = envelope * smooth((chapter.end - seconds) / 0.8);
  const speechWeight = Math.min(
    1,
    Object.values(mouth).reduce((a, b) => a + b, 0),
  );
  for (const key of Object.keys(face)) {
    if (key.startsWith("jaw") || key.startsWith("mouthPress"))
      face[key] *= 1 - speechWeight;
    else if (key.startsWith("mouth")) face[key] *= 1 - 0.75 * speechWeight;
  }
  Object.assign(face, mouth);
  const phase = (seconds + 0.9) % 4.13;
  const blink = phase < 0.24 ? Math.sin((Math.PI * phase) / 0.24) ** 2 : 0;
  face.eyeBlinkLeft = blink;
  face.eyeBlinkRight = blink;
  const thinking = chapter.expression === "thinking";
  const turn = thinking ? -0.065 : speaking ? 0.016 : 0.035;
  // Small, bounded motion: a listening nod, a glance while thinking, soft speech emphasis.
  return {
    face,
    rotation: [
      motionEnvelope *
        (0.009 * Math.sin(seconds * 0.9) +
          (speaking
            ? 0.018 * Math.sin(local * 2.1)
            : 0.025 * Math.sin(local * 1.3))),
      motionEnvelope * turn * Math.sin(local * 0.42),
      motionEnvelope * 0.014 * Math.sin(seconds * 0.6),
    ],
    gaze: [
      thinking ? -0.06 * envelope : 0.016 * Math.sin(seconds * 0.57),
      thinking ? 0.025 * envelope : 0.008 * Math.sin(seconds * 0.91),
    ],
  };
}
