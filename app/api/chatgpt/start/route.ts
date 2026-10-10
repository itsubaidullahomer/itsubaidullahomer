import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  guard,
  store,
  keyFor,
  discovery,
  startBudget,
  json,
  cookieOptions,
  FLOW_COOKIE,
  readInput,
} from "@/lib/chatgpt/server";
import {
  transaction,
  randomId,
  seal,
  opaqueId,
  TRANSACTION_SECONDS,
  PLAN_SCOPE,
  RESOURCE,
} from "@/lib/chatgpt/security";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const cfg = guard(request);
  if (cfg instanceof NextResponse) return cfg;
  try {
    const input = await readInput(request);
    if (!(await startBudget(request, cfg)))
      return json(
        { error: "Too many connection attempts. Try again in a few minutes." },
        429,
      );
    const endpoints = await discovery();
    const tx = transaction(cfg.redirectUri);
    const id = randomId();
    const previous = (await cookies()).get(FLOW_COOKIE)?.value;
    if (opaqueId(previous)) await store().del(keyFor("flow", previous));
    await store().set(keyFor("flow", id), seal(tx, cfg.key), {
      ex: TRANSACTION_SECONDS,
    });
    const url = new URL(endpoints.authorization_endpoint);
    url.search = new URLSearchParams({
      client_id: cfg.clientId,
      redirect_uri: tx.redirectUri,
      response_type: "code",
      scope: `openid profile email resource.invoke ${PLAN_SCOPE}`,
      resource: RESOURCE,
      state: tx.state,
      nonce: tx.nonce,
      code_challenge: tx.challenge,
      code_challenge_method: "S256",
    }).toString();
    if (input?.reconsent === true) url.searchParams.set("prompt", "consent");
    const response = json({ url: url.toString() });
    response.cookies.set(FLOW_COOKIE, id, cookieOptions(TRANSACTION_SECONDS));
    return response;
  } catch {
    return json(
      { error: "The connection couldn’t start. Please try again in a moment." },
      503,
    );
  }
}
