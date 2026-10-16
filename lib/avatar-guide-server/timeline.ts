import {
  EMOTIONS,
  GESTURES,
  type Emotion,
  type Gesture,
} from "../avatar-guide/vocabulary";
import generatedIndex from "./site-index.json";
import type { SiteTarget } from "./site-index-types";
export const SITE_INDEX = generatedIndex as SiteTarget[];
export type TimelineAction =
  | { type: "react"; emotion: Emotion; intensity: number; gesture: Gesture }
  | { type: "navigate"; sectionId: string }
  | { type: "point"; selector: string }
  | {
      type: "say";
      text: string;
      emotion: Emotion;
      intensity: number;
      gestures: { atWord: number; name: Gesture }[];
    };
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const emotion = (value: unknown): Emotion =>
  EMOTIONS.includes(value as Emotion) ? (value as Emotion) : "neutral";
const gesture = (value: unknown): Gesture =>
  GESTURES.includes(value as Gesture) ? (value as Gesture) : "nod";
const intensity = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : 0.35;

// Unknown navigation/pointing targets are discarded, never treated as selectors or URLs.
export function validateAction(
  value: unknown,
  targets: readonly SiteTarget[] = SITE_INDEX,
): TimelineAction | null {
  if (!record(value)) return null;
  if (value.type === "react")
    return {
      type: "react",
      emotion: emotion(value.emotion),
      intensity: intensity(value.intensity),
      gesture: gesture(value.gesture),
    };
  if (value.type === "navigate")
    return targets.some((t) => t.sectionId === value.sectionId)
      ? { type: "navigate", sectionId: value.sectionId as string }
      : null;
  if (value.type === "point")
    return targets.some((t) => t.selector === value.selector)
      ? { type: "point", selector: value.selector as string }
      : null;
  if (value.type !== "say" || typeof value.text !== "string") return null;
  const text = value.text.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  if (!text || text.length > 900) return null;
  const count = text.split(/\s+/).length;
  const gestures = (Array.isArray(value.gestures) ? value.gestures : [])
    .flatMap((g) => {
      if (
        !record(g) ||
        !Number.isSafeInteger(g.atWord) ||
        (g.atWord as number) < 0 ||
        (g.atWord as number) >= count ||
        !GESTURES.includes(g.name as Gesture)
      )
        return [];
      return [{ atWord: g.atWord as number, name: g.name as Gesture }];
    })
    .slice(0, 3);
  return {
    type: "say",
    text,
    emotion: emotion(value.emotion),
    intensity: intensity(value.intensity),
    gestures,
  };
}
export function validateTimeline(
  value: unknown,
  targets: readonly SiteTarget[] = SITE_INDEX,
): TimelineAction[] {
  const actions = Array.isArray(value)
    ? value
    : record(value) && Array.isArray(value.timeline)
      ? value.timeline
      : [];
  const sequence = new ActionSequence(targets);
  return actions.slice(0, 20).flatMap((action) => {
    const valid = sequence.accept(action);
    return valid ? [valid] : [];
  });
}
class ActionSequence {
  private path: string | undefined;
  constructor(private targets: readonly SiteTarget[] = SITE_INDEX) {}
  accept(value: unknown) {
    const action = validateAction(value, this.targets);
    if (!action) return null;
    if (action.type === "navigate")
      this.path = this.targets.find(
        (target) => target.sectionId === action.sectionId,
      )?.path;
    if (
      action.type === "point" &&
      !this.targets.some(
        (target) =>
          target.selector === action.selector && target.path === this.path,
      )
    )
      return null;
    return action;
  }
}
const object = (properties: Record<string, unknown>) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const enumString = (values: readonly string[]) => ({
  type: "string",
  enum: [...new Set(values)],
});
export function timelineSchema(targets: readonly SiteTarget[] = SITE_INDEX) {
  const feeling = {
    emotion: enumString(EMOTIONS),
    intensity: { type: "number", minimum: 0, maximum: 1 },
  };
  return object({
    timeline: {
      type: "array",
      minItems: 1,
      maxItems: 20,
      items: {
        anyOf: [
          object({
            type: { const: "react", type: "string" },
            ...feeling,
            gesture: enumString(GESTURES),
          }),
          object({
            type: { const: "navigate", type: "string" },
            sectionId: enumString(targets.map((t) => t.sectionId)),
          }),
          object({
            type: { const: "point", type: "string" },
            selector: enumString(targets.map((t) => t.selector)),
          }),
          object({
            type: { const: "say", type: "string" },
            text: { type: "string", minLength: 1, maxLength: 900 },
            ...feeling,
            gestures: {
              type: "array",
              maxItems: 3,
              items: object({
                atWord: { type: "integer", minimum: 0 },
                name: enumString(GESTURES),
              }),
            },
          }),
        ],
      },
    },
  });
}

// Only emit complete objects inside the root timeline array. Strings may contain
// braces, escaped quotes and arbitrary chunk boundaries; none execute early.
export class TimelineDecoder {
  private text = "";
  private emitted = 0;
  private sequence = new ActionSequence();
  push(chunk: string): TimelineAction[] {
    this.text += chunk;
    if (this.text.length > 16000) throw new Error("Timeline output too large");
    const start = this.text.match(/^\s*\{\s*"timeline"\s*:\s*\[/)?.[0].length;
    if (!start) return [];
    const complete: unknown[] = [];
    let depth = 0,
      quoted = false,
      escaped = false,
      objectStart = -1;
    for (let i = start; i < this.text.length; i++) {
      const char = this.text[i];
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === '"') quoted = false;
        continue;
      }
      if (char === '"') {
        quoted = true;
        continue;
      }
      if (char === "{" || char === "[") {
        if (depth === 0 && char === "{") objectStart = i;
        depth++;
      } else if (char === "}" || char === "]") {
        if (depth === 0) break;
        depth--;
        if (depth === 0 && objectStart >= 0) {
          complete.push(JSON.parse(this.text.slice(objectStart, i + 1)));
          objectStart = -1;
        }
      }
    }
    if (complete.length > 20) throw new Error("Too many timeline actions");
    const fresh = complete.slice(this.emitted);
    this.emitted = complete.length;
    return fresh.flatMap((action) => {
      const valid = this.sequence.accept(action);
      return valid ? [valid] : [];
    });
  }
  finish() {
    const parsed: unknown = JSON.parse(this.text);
    if (
      !record(parsed) ||
      !Array.isArray(parsed.timeline) ||
      Object.keys(parsed).length !== 1
    )
      throw new Error("Invalid timeline envelope");
    const actions = validateTimeline(parsed);
    if (!actions.some((a) => a.type === "say"))
      throw new Error("Timeline has no speech");
    return actions;
  }
}
