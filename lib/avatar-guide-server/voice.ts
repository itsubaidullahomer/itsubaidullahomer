import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { store } from "../chatgpt/server";
import { randomId, RESOURCE, UNLOCK } from "../chatgpt/security";
import { clientIdentity } from "../avatar/policy";
import { paidConfig, RESERVE_GUIDE_TURN } from "./policy";
import { guideEncryptionKey, guideKey, readGuideSession } from "./session";
import {
  alignmentWords,
  decodeTranscription,
  estimatedWords,
  parseWav,
  pronunciationVisemes,
  transcriptionConfig,
  validSpeechRequest,
  voiceConfig,
} from "./voice-policy";

let dictionary: Promise<Map<string, string[]>> | undefined;
function pronunciations() {
  dictionary ??= readFile(
    join(process.cwd(), "lib/avatar-guide-server/cmudict.dict"),
    "utf8",
  ).then((text) => {
    const result = new Map<string, string[]>();
    for (const line of text.split("\n")) {
      const [word, ...phonemes] = line.trim().split(/\s+/);
      if (word && !word.includes("(") && phonemes.length)
        result.set(word.toLowerCase(), phonemes);
    }
    return result;
  });
  return dictionary;
}
const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
async function limitedBytes(response: Response, maximum: number) {
  if (!response.ok || !response.body)
    throw new Error("Voice provider unavailable");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximum) throw new Error("Voice response too large");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  return Buffer.concat(chunks, size);
}
export async function voiceOperation(
  request: Request,
  body: Record<string, unknown>,
) {
  const paid = paidConfig(process.env);
  const tts = voiceConfig(process.env);
  const stt = transcriptionConfig(process.env);
  if (!paid || (body.operation === "speech" ? !tts : !stt))
    return json(
      {
        error:
          "Provider voice is not configured. Use the standard device voice or text input.",
        code: "voice_not_configured",
      },
      503,
    );
  let audio: Uint8Array | undefined;
  if (body.operation === "speech" && !validSpeechRequest(body))
    return json({ error: "Speech needs 1–900 characters." }, 400);
  if (body.operation === "transcribe") {
    try {
      audio = decodeTranscription(body);
    } catch {
      return json(
        {
          error:
            "Use a mono, 16-bit, 16 kHz PCM WAV recording of at most 30 seconds.",
        },
        400,
      );
    }
  }
  let lock = "",
    locked = false;
  const owner = randomId();
  try {
    const current = await readGuideSession();
    // A ChatGPT sign-in alone is never permission to spend the site's voice budget.
    if (!current || current.guide.kind !== "openai")
      return json(
        {
          error: "Provider voice requires an invited paid session.",
          code: "invitation_required",
        },
        401,
      );
    const id = current.guide.id;
    lock = guideKey("voice-lock", id);
    const identity = clientIdentity(
      request,
      guideEncryptionKey().toString("hex"),
    );
    const reserve =
      body.operation === "speech" ? tts!.reserveMicros : stt!.reserveMicros;
    const result = await store().eval(
      RESERVE_GUIDE_TURN,
      [
        guideKey("session", id),
        lock,
        guideKey("voice-ip", identity),
        guideKey("voice-turns", id),
        guideKey("budget", id),
        guideKey("daily-budget", new Date().toISOString().slice(0, 10)),
      ],
      [owner, 24, 96, reserve, paid.sessionMicros, paid.dailyMicros],
    );
    if (result !== "ok")
      return json(
        {
          error:
            "The configured voice limit has been reached. Text and the device voice are still available.",
          code: result,
        },
        result === "busy" ? 409 : 429,
      );
    locked = true;
    const signal = AbortSignal.any([
      request.signal,
      AbortSignal.timeout(
        Math.max(1, Math.min(40000, current.guide.expiresAt - Date.now())),
      ),
    ]);
    if (body.operation === "transcribe") {
      const form = new FormData();
      form.set("model", stt!.model);
      form.set("language", "en");
      form.set("response_format", "json");
      form.set(
        "file",
        new Blob([new Uint8Array(audio!)], { type: "audio/wav" }),
        "question.wav",
      );
      const response = await fetch(`${RESOURCE}/audio/transcriptions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: form,
        signal,
        redirect: "error",
        cache: "no-store",
      });
      const payload = JSON.parse(
        (await limitedBytes(response, 16000)).toString("utf8"),
      );
      if (
        typeof payload.text !== "string" ||
        !payload.text.trim() ||
        payload.text.length > 1200
      )
        throw new Error("Invalid transcription");
      return json({ text: payload.text.trim() });
    }
    const text = (body.text as string).trim();
    let bytes: Buffer, words, quality: string, mimeType: string;
    if (tts!.provider === "elevenlabs") {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(tts!.voice)}/with-timestamps?output_format=mp3_44100_128`,
        {
          method: "POST",
          headers: {
            "xi-api-key": process.env.ELEVENLABS_API_KEY!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text, model_id: tts!.model }),
          signal,
          redirect: "error",
          cache: "no-store",
        },
      );
      const payload = JSON.parse(
        (await limitedBytes(response, 3_000_000)).toString("utf8"),
      );
      if (
        typeof payload.audio_base64 !== "string" ||
        !/^[A-Za-z0-9+/]+={0,2}$/.test(payload.audio_base64)
      )
        throw new Error("Missing voice audio");
      bytes = Buffer.from(payload.audio_base64, "base64");
      if (bytes.length > 2_000_000) throw new Error("Voice audio too large");
      words = alignmentWords(payload.normalized_alignment || payload.alignment);
      if (!words.length) throw new Error("Missing voice timing");
      quality = "character-timed-phoneme-estimates";
      mimeType = "audio/mpeg";
    } else {
      const response = await fetch(`${RESOURCE}/audio/speech`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: tts!.model,
          voice: tts!.custom ? { id: tts!.voice } : tts!.voice,
          input: text,
          response_format: "wav",
        }),
        signal,
        redirect: "error",
        cache: "no-store",
      });
      bytes = await limitedBytes(response, 2_400_000);
      const { duration } = parseWav(bytes, false);
      words = estimatedWords(text, duration);
      quality = "duration-estimates";
      mimeType = "audio/wav";
    }
    const visemes = pronunciationVisemes(words, await pronunciations());
    return json({
      audioBase64: bytes.toString("base64"),
      mimeType,
      wordTimings: words,
      visemes,
      timingQuality: quality,
      voiceKind: tts!.custom ? "custom" : "standard",
      spokenText: words.map((word) => word.word).join(" "),
    });
  } catch {
    return json(
      {
        error:
          "Provider voice could not finish. Use text or the standard device voice.",
        code: "voice_unavailable",
      },
      503,
    );
  } finally {
    if (locked)
      await store()
        .eval(UNLOCK, [lock], [owner])
        .catch(() => {});
  }
}
