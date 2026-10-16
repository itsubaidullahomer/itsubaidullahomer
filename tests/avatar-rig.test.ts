import { test } from "node:test";
import assert from "node:assert/strict";
import {
  composeFace,
  sampleMouth,
  SpeechTrack,
  validateCues,
} from "../lib/avatar/rig";

const cues = [
  { start: 0, end: 0.2, value: "PP" as const },
  { start: 0.2, end: 0.5, value: "aa" as const },
];

test("mouth cues blend across a phoneme boundary without overdriving the mesh", () => {
  const weights = sampleMouth(cues, 0.2);
  assert.ok(weights.viseme_PP > 0 && weights.viseme_aa > 0);
  assert.ok(Object.values(weights).reduce((a, b) => a + b, 0) <= 1);
  assert.deepEqual(sampleMouth(cues, 0.5), {});
  assert.deepEqual(sampleMouth(cues, NaN), {});
  assert.ok(sampleMouth(cues, 0.1).viseme_PP > 0.9);
});

test("audio pause, interruption and stale utterance chunks cannot keep the mouth moving", () => {
  const track = new SpeechTrack();
  track.start("first", cues);
  assert.ok(track.sample("first", 0.1, true).viseme_PP);
  assert.deepEqual(track.sample("first", 0.1, false), {});
  track.cancel();
  assert.equal(track.replace("first", cues), false);
  assert.deepEqual(track.sample("first", 0.1, true), {});
  track.start("second", cues);
  assert.deepEqual(track.sample("first", 0.1, true), {});
  assert.ok(track.sample("second", 0.3, true).viseme_aa);
  assert.ok(track.sample("second", 0.1, true).viseme_PP);
});

test("speech owns the mouth while the expression and blink remain independent", () => {
  const face = composeFace("laughing", 1, { viseme_PP: 1 }, 0.8);
  assert.equal(face.jawOpen, 0);
  assert.equal(face.mouthSmileLeft, 0);
  assert.equal(face.cheekSquintLeft, 0.3);
  assert.equal(face.eyeBlinkLeft, 0.8);
  assert.equal(face.viseme_PP, 1);
});

test("invalid timing and unknown mouth shapes fail before playback", () => {
  assert.throws(() => validateCues([{ start: 0, end: Infinity, value: "aa" }]));
  assert.throws(() => validateCues([{ start: 0, end: 1, value: "unknown" }]));
  assert.throws(() =>
    validateCues([...cues, { start: 0.3, end: 1, value: "sil" }]),
  );
  assert.deepEqual(validateCues(cues), cues);
});

import { chapterAt, sampleConversation } from "../lib/avatar/conversation";
import conversation from "../assets/avatar/ubaid-conversation/conversation.json";
const conversationCues = validateCues(conversation.cues);

test("the complete conversation remains bounded and silent during listening pauses", () => {
  for (let t = 0; t < conversation.duration; t += 0.02) {
    const chapter = conversation.chapters[chapterAt(conversation.chapters, t)];
    const pose = sampleConversation(conversation.chapters, conversationCues, t);
    for (const value of Object.values(pose.face))
      assert.ok(Number.isFinite(value) && value >= 0 && value <= 1);
    assert.ok(pose.rotation.every((v) => Math.abs(v) < 0.1));
    if (!chapter.text || t >= chapter.speechEnd)
      assert.ok(Object.keys(pose.face).every((k) => !k.startsWith("viseme_")));
  }
});

test("seeking is deterministic and the completed performance returns to rest", () => {
  const pose = sampleConversation(conversation.chapters, conversationCues, 9.4);
  sampleConversation(conversation.chapters, conversationCues, 50);
  assert.deepEqual(
    sampleConversation(conversation.chapters, conversationCues, 9.4),
    pose,
  );
  for (const t of [-1, NaN, conversation.duration, Infinity])
    assert.deepEqual(
      sampleConversation(conversation.chapters, conversationCues, t),
      { face: {}, rotation: [0, 0, 0], gaze: [0, 0] },
    );
});

test("expressions transition continuously across chapter boundaries", () => {
  for (const chapter of conversation.chapters.slice(1)) {
    const before = sampleConversation(
      conversation.chapters,
      conversationCues,
      chapter.start - 0.001,
    );
    const after = sampleConversation(
      conversation.chapters,
      conversationCues,
      chapter.start + 0.001,
    );
    for (const key of Object.keys(before.face).filter(
      (k) => !k.startsWith("eyeBlink") && !k.startsWith("viseme"),
    ))
      assert.ok(
        Math.abs((before.face[key] ?? 0) - (after.face[key] ?? 0)) < 0.02,
        key,
      );
  }
});
