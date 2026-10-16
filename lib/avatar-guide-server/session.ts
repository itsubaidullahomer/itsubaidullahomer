import "server-only";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  store,
  config as chatConfig,
  keyFor,
  type Connection,
} from "../chatgpt/server";
import {
  opaqueId,
  randomId,
  seal,
  unseal,
  encryptionKey,
  sameSecret,
} from "../chatgpt/security";
import { GUIDE_COOKIE, GUIDE_SECONDS, paidConfig } from "./policy";
export type GuideSession = {
  id: string;
  kind: "chatgpt" | "openai";
  expiresAt: number;
  chatId?: string;
};
export const guideKey = (kind: string, id: string) =>
  `avatar-guide:${kind}:${id}`;
export function guideEncryptionKey() {
  return encryptionKey(
    process.env.AVATAR_GUIDE_SESSION_SECRET ||
      process.env.CHATGPT_SESSION_SECRET,
  );
}
export function guideConfigured() {
  if (
    !process.env.UPSTASH_REDIS_REST_URL ||
    !process.env.UPSTASH_REDIS_REST_TOKEN
  )
    return false;
  try {
    guideEncryptionKey();
  } catch {
    return false;
  }
  return process.env.AVATAR_GUIDE_PROVIDER === "chatgpt"
    ? !!chatConfig()
    : !!paidConfig(process.env);
}
export async function createGuideSession(
  kind: GuideSession["kind"],
  chatId?: string,
  expiresAt = Date.now() + GUIDE_SECONDS * 1000,
) {
  const current = {
    id: randomId(),
    kind,
    expiresAt: Math.min(expiresAt, Date.now() + GUIDE_SECONDS * 1000),
    ...(chatId ? { chatId } : {}),
  };
  await store().set(
    guideKey("session", current.id),
    seal(current, guideEncryptionKey()),
    { ex: Math.max(1, Math.floor((current.expiresAt - Date.now()) / 1000)) },
  );
  return current;
}
export function attachGuideSession(
  response: NextResponse,
  current: GuideSession,
) {
  response.cookies.set(GUIDE_COOKIE, current.id, {
    path: "/api/avatar",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    maxAge: Math.max(1, Math.floor((current.expiresAt - Date.now()) / 1000)),
  });
  return response;
}
export async function readGuideSession(): Promise<{
  guide: GuideSession;
  connection?: Connection & { id: string };
} | null> {
  const id = (await cookies()).get(GUIDE_COOKIE)?.value;
  if (!opaqueId(id)) return null;
  const encrypted = await store().get<string>(guideKey("session", id));
  if (!encrypted) return null;
  const guide = unseal<GuideSession>(encrypted, guideEncryptionKey());
  if (guide.id !== id || guide.expiresAt <= Date.now()) return null;
  if (guide.kind === "openai")
    return paidConfig(process.env) ? { guide } : null;
  const cfg = chatConfig();
  if (!cfg || !opaqueId(guide.chatId)) return null;
  const original = await store().get<string>(keyFor("session", guide.chatId));
  if (!original) return null;
  const connection = unseal<Connection>(original, cfg.key);
  if (connection.expiresAt <= Date.now()) return null;
  return { guide, connection: { ...connection, id: guide.chatId } };
}
export function validInvite(value: unknown) {
  const configured = process.env.AVATAR_GUIDE_INVITE_CODE;
  return (
    typeof value === "string" &&
    value.length <= 200 &&
    !!configured &&
    configured.length >= 24 &&
    sameSecret(value, configured)
  );
}
