import type { Viseme, VisemeCue, WordTiming } from "../avatar-guide/vocabulary";
export type VoiceConfig = {
  provider: "openai" | "elevenlabs";
  model: string;
  voice: string;
  custom: boolean;
  reserveMicros: number;
};
export function voiceConfig(
  env: Record<string, string | undefined>,
): VoiceConfig | null {
  if (
    env.AVATAR_GUIDE_PROVIDER !== "openai" ||
    env.AVATAR_GUIDE_PAID_ENABLED !== "true" ||
    env.AVATAR_GUIDE_PAID_VOICE_ENABLED !== "true"
  )
    return null;
  const provider = env.AVATAR_GUIDE_TTS_PROVIDER;
  const model = env.AVATAR_GUIDE_TTS_MODEL || "";
  const voice = env.AVATAR_GUIDE_TTS_VOICE || "";
  const reserve = Number(env.AVATAR_GUIDE_TTS_RESERVE_USD);
  if (provider !== "openai" && provider !== "elevenlabs") return null;
  if (
    !/^[a-zA-Z0-9._:-]{1,100}$/.test(model) ||
    !/^[a-zA-Z0-9_-]{1,100}$/.test(voice) ||
    !Number.isFinite(reserve) ||
    reserve <= 0 ||
    reserve > 1
  )
    return null;
  if (!(provider === "openai" ? env.OPENAI_API_KEY : env.ELEVENLABS_API_KEY))
    return null;
  const custom = env.AVATAR_GUIDE_CUSTOM_VOICE === "true";
  if (custom && env.AVATAR_GUIDE_VOICE_CONSENT_CONFIRMED !== "true")
    return null;
  return {
    provider,
    model,
    voice,
    custom,
    reserveMicros: Math.ceil(reserve * 1e6),
  };
}
export function transcriptionConfig(env: Record<string, string | undefined>) {
  if (
    env.AVATAR_GUIDE_PROVIDER !== "openai" ||
    env.AVATAR_GUIDE_PAID_ENABLED !== "true" ||
    env.AVATAR_GUIDE_PAID_VOICE_ENABLED !== "true" ||
    !env.OPENAI_API_KEY
  )
    return null;
  const model = env.AVATAR_GUIDE_STT_MODEL || "";
  const reserve = Number(env.AVATAR_GUIDE_STT_RESERVE_USD);
  return /^[a-zA-Z0-9._:-]{1,100}$/.test(model) &&
    Number.isFinite(reserve) &&
    reserve > 0 &&
    reserve <= 1
    ? { model, reserveMicros: Math.ceil(reserve * 1e6) }
    : null;
}
export function validSpeechRequest(
  body: unknown,
): body is { operation: "speech"; text: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  const b = body as Record<string, unknown>;
  return (
    b.operation === "speech" &&
    typeof b.text === "string" &&
    b.text.trim().length > 0 &&
    b.text.length <= 900 &&
    Object.keys(b).every((key) => ["operation", "text"].includes(key))
  );
}
export function parseWav(bytes: Uint8Array, input = true) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (offset: number) =>
    String.fromCharCode(...bytes.subarray(offset, offset + 4));
  if (bytes.length < 44 || tag(0) !== "RIFF" || tag(8) !== "WAVE")
    throw new Error("Use PCM WAV audio");
  const declared = view.getUint32(4, true);
  // Some streamed providers use 0xffffffff for RIFF/data lengths. Browser input
  // must contain exact lengths; provider output can use this streaming sentinel.
  if (input && declared + 8 !== bytes.length)
    throw new Error("Invalid WAV length");
  let rate = 0,
    channels = 0,
    bits = 0,
    size = 0,
    pcm = false;
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const kind = tag(offset);
    let length = view.getUint32(offset + 4, true);
    if (!input && length === 0xffffffff && kind === "data")
      length = bytes.length - offset - 8;
    if (offset + 8 + length > bytes.length) throw new Error("Truncated WAV");
    if (kind === "fmt ") {
      if (length < 16) throw new Error("Invalid WAV format");
      pcm = view.getUint16(offset + 8, true) === 1;
      channels = view.getUint16(offset + 10, true);
      rate = view.getUint32(offset + 12, true);
      bits = view.getUint16(offset + 22, true);
      if (
        view.getUint32(offset + 16, true) !== (rate * channels * bits) / 8 ||
        view.getUint16(offset + 20, true) !== (channels * bits) / 8
      )
        throw new Error("Invalid PCM rate");
    }
    if (kind === "data") {
      if (size) throw new Error("Multiple WAV data chunks");
      size = length;
    }
    offset += 8 + length + (length % 2);
  }
  if (
    !pcm ||
    !size ||
    bits !== 16 ||
    channels !== 1 ||
    (input ? rate !== 16000 : rate < 8000 || rate > 48000) ||
    size % 2
  )
    throw new Error("Use mono 16-bit PCM WAV at 16 kHz");
  const duration = size / ((rate * channels * bits) / 8);
  if (duration < 0.05 || duration > (input ? 30 : 120))
    throw new Error("Audio duration outside limit");
  return { duration, sampleRate: rate };
}
export function decodeTranscription(body: unknown): Uint8Array {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw new Error("Invalid recording");
  const b = body as Record<string, unknown>;
  if (
    b.operation !== "transcribe" ||
    typeof b.audioBase64 !== "string" ||
    b.audioBase64.length > 1_280_100 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(b.audioBase64) ||
    Object.keys(b).some((key) => !["operation", "audioBase64"].includes(key))
  )
    throw new Error("Invalid recording");
  const bytes = new Uint8Array(Buffer.from(b.audioBase64, "base64"));
  parseWav(bytes);
  return bytes;
}
export function alignmentWords(value: unknown): WordTiming[] {
  if (!value || typeof value !== "object") return [];
  const a = value as Record<string, unknown>;
  if (
    !Array.isArray(a.characters) ||
    !Array.isArray(a.character_start_times_seconds) ||
    !Array.isArray(a.character_end_times_seconds) ||
    a.characters.length > 5000
  )
    return [];
  const output: WordTiming[] = [];
  let word = "",
    start = 0,
    end = 0,
    previous = 0;
  for (let i = 0; i < a.characters.length; i++) {
    const char = a.characters[i],
      from = a.character_start_times_seconds[i],
      to = a.character_end_times_seconds[i];
    if (
      typeof char !== "string" ||
      typeof from !== "number" ||
      typeof to !== "number" ||
      !Number.isFinite(from) ||
      !Number.isFinite(to) ||
      from < previous ||
      to < from ||
      to > 120
    )
      return [];
    previous = from;
    if (/\s/.test(char)) {
      if (word && end > start) output.push({ word, start, end });
      word = "";
    } else {
      if (!word) {
        start = from;
        if (output.length && start < output[output.length - 1].end)
          return [];
      }
      word += char;
      end = to;
    }
  }
  if (word && end > start) output.push({ word, start, end });
  return output;
}
export function estimatedWords(text: string, duration: number): WordTiming[] {
  const words = text.trim().split(/\s+/);
  const weights = words.map((word) =>
    Math.max(2, word.replace(/[^a-z]/gi, "").length),
  );
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let at = 0;
  return words.map((word, index) => {
    const start = at;
    at += (duration * weights[index]) / total;
    return { word, start, end: at };
  });
}
const PHONEMES: Record<string, Viseme> = {
  P: "PP",
  B: "PP",
  M: "PP",
  F: "FF",
  V: "FF",
  TH: "TH",
  DH: "TH",
  T: "DD",
  D: "DD",
  K: "kk",
  G: "kk",
  NG: "kk",
  CH: "CH",
  JH: "CH",
  SH: "CH",
  ZH: "CH",
  S: "SS",
  Z: "SS",
  N: "nn",
  L: "nn",
  R: "RR",
  ER: "RR",
  AA: "aa",
  AE: "aa",
  AH: "aa",
  AY: "aa",
  AW: "aa",
  EH: "E",
  EY: "E",
  IH: "I",
  IY: "I",
  Y: "I",
  AO: "O",
  OW: "O",
  OY: "O",
  UH: "U",
  UW: "U",
  W: "U",
  HH: "aa",
};
export function pronunciationVisemes(
  words: WordTiming[],
  dictionary: ReadonlyMap<string, string[]>,
): VisemeCue[] {
  return words.flatMap((word) => {
    const phonemes = dictionary.get(
      word.word.toLowerCase().replace(/[^a-z']/g, ""),
    );
    if (!phonemes || word.end <= word.start) return []; // Unknown pronunciation is left neutral, not invented from spelling.
    const values = phonemes
      .map((p) => PHONEMES[p.replace(/[0-2]/g, "")])
      .filter(Boolean);
    const duration = word.end - word.start;
    return values.map((value, i) => ({
      start: word.start + (duration * i) / values.length,
      end: word.start + (duration * (i + 1)) / values.length,
      value,
    }));
  });
}
