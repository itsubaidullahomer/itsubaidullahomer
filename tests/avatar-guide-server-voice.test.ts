import test from "node:test";
import assert from "node:assert/strict";
import {
  alignmentWords,
  decodeTranscription,
  estimatedWords,
  parseWav,
  pronunciationVisemes,
  transcriptionConfig,
  validSpeechRequest,
  voiceConfig,
} from "../lib/avatar-guide-server/voice-policy";
function wav(seconds = 1) {
  const bytes = Buffer.alloc(44 + Math.floor(seconds * 32000));
  bytes.write("RIFF", 0);
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(16000, 24);
  bytes.writeUInt32LE(32000, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(bytes.length - 44, 40);
  return bytes;
}
test("voice requires an explicitly paid provider, configured model and reservation", () => {
  const env = {
    AVATAR_GUIDE_PROVIDER: "openai",
    AVATAR_GUIDE_PAID_ENABLED: "true",
    AVATAR_GUIDE_PAID_VOICE_ENABLED: "true",
    OPENAI_API_KEY: "test",
    AVATAR_GUIDE_TTS_PROVIDER: "openai",
    AVATAR_GUIDE_TTS_MODEL: "configured-model",
    AVATAR_GUIDE_TTS_VOICE: "configured-voice",
    AVATAR_GUIDE_TTS_RESERVE_USD: "0.05",
    AVATAR_GUIDE_STT_MODEL: "configured-transcribe",
    AVATAR_GUIDE_STT_RESERVE_USD: "0.01",
  };
  assert.ok(voiceConfig(env));
  assert.ok(transcriptionConfig(env));
  assert.equal(voiceConfig({ ...env, AVATAR_GUIDE_PROVIDER: "chatgpt" }), null);
  assert.equal(
    transcriptionConfig({ ...env, AVATAR_GUIDE_PROVIDER: "chatgpt" }),
    null,
  );
  assert.equal(
    voiceConfig({ ...env, AVATAR_GUIDE_PAID_VOICE_ENABLED: "false" }),
    null,
  );
  assert.equal(
    voiceConfig({ ...env, AVATAR_GUIDE_CUSTOM_VOICE: "true" }),
    null,
  );
  assert.ok(
    voiceConfig({
      ...env,
      AVATAR_GUIDE_CUSTOM_VOICE: "true",
      AVATAR_GUIDE_VOICE_CONSENT_CONFIRMED: "true",
    }),
  );
  assert.equal(
    voiceConfig({ ...env, AVATAR_GUIDE_TTS_RESERVE_USD: "0" }),
    null,
  );
  assert.equal(
    transcriptionConfig({ ...env, AVATAR_GUIDE_STT_RESERVE_USD: "NaN" }),
    null,
  );
});
test("audio duration is verified from PCM bytes, not client-provided metadata", () => {
  assert.equal(parseWav(wav(2)).duration, 2);
  assert.equal(
    decodeTranscription({
      operation: "transcribe",
      audioBase64: wav().toString("base64"),
    }).length,
    32044,
  );
  assert.throws(() => parseWav(wav(30.1)));
  const falseSize = wav();
  falseSize.writeUInt32LE(1, 40);
  assert.throws(() => parseWav(falseSize));
  const stereo = wav();
  stereo.writeUInt16LE(2, 22);
  assert.throws(() => parseWav(stereo));
  const compressed = wav();
  compressed.writeUInt16LE(3, 20);
  assert.throws(() => parseWav(compressed));
  assert.throws(() =>
    decodeTranscription({
      operation: "transcribe",
      audioBase64: wav().toString("base64"),
      duration: 1,
    }),
  );
  assert.throws(() =>
    decodeTranscription({
      operation: "transcribe",
      audioBase64: "https://evil.example",
    }),
  );
});
test("provider streaming WAV sentinel supports measured output duration", () => {
  const bytes = wav(1.5);
  bytes.writeUInt32LE(0xffffffff, 4);
  bytes.writeUInt32LE(0xffffffff, 40);
  assert.throws(() => parseWav(bytes));
  assert.equal(parseWav(bytes, false).duration, 1.5);
});
test("character alignment groups precise words and rejects malformed timing", () => {
  const alignment = {
    characters: [..."Hi Ubaid"],
    character_start_times_seconds: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7],
    character_end_times_seconds: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
  };
  assert.deepEqual(alignmentWords(alignment), [
    { word: "Hi", start: 0, end: 0.2 },
    { word: "Ubaid", start: 0.3, end: 0.8 },
  ]);
  assert.deepEqual(
    alignmentWords({ ...alignment, character_end_times_seconds: [NaN] }),
    [],
  );
  assert.deepEqual(
    alignmentWords({ ...alignment, character_start_times_seconds: [0, -0.1] }),
    [],
  );
  assert.deepEqual(alignmentWords({
    characters: ["I", " ", "a"],
    character_start_times_seconds: [0, 0.1, 0.2],
    character_end_times_seconds: [0.4, 0.2, 0.3],
  }), []);
  assert.deepEqual(alignmentWords({
    characters: ["I"],
    character_start_times_seconds: [0],
    character_end_times_seconds: [0],
  }), []);
});
test("pronunciation cues use phonemes rather than arbitrary spelling or loudness", () => {
  const dictionary = new Map([
    ["phone", ["F", "OW1", "N"]],
    ["speech", ["S", "P", "IY1", "CH"]],
  ]);
  const words = [
    { word: "phone", start: 0, end: 0.6 },
    { word: "speech", start: 0.7, end: 1.5 },
  ];
  const cues = pronunciationVisemes(words, dictionary);
  assert.deepEqual(
    cues.map((cue) => cue.value),
    ["FF", "O", "nn", "SS", "PP", "I", "CH"],
  );
  assert.deepEqual(
    pronunciationVisemes([{ word: "unknown", start: 0, end: 1 }], dictionary),
    [],
  );
  assert.ok(cues.every((cue) => cue.start < cue.end));
  const estimated = estimatedWords("This is a preview.", 3);
  assert.equal(estimated.at(-1)!.end, 3);
});
test("speech cannot carry provider settings or exceed the per-call text bound", () => {
  assert.equal(
    validSpeechRequest({ operation: "speech", text: "Hello." }),
    true,
  );
  assert.equal(
    validSpeechRequest({
      operation: "speech",
      text: "Hello",
      voice: "attacker",
    }),
    false,
  );
  assert.equal(
    validSpeechRequest({ operation: "speech", text: "x".repeat(901) }),
    false,
  );
});
