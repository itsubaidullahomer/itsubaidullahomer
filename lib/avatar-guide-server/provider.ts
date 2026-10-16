import { avatarInstructions } from "./persona";
import { GUIDE_OUTPUT_TOKENS } from "./policy";
import { timelineSchema } from "./timeline";
export type GuideMessage = { role: "user" | "assistant"; content: string };
export function responsesBody(
  provider: "chatgpt" | "openai",
  model: string,
  input: GuideMessage[],
) {
  return {
    model,
    instructions: avatarInstructions(),
    input,
    store: false,
    stream: true,
    text: {
      format: {
        type: "json_schema",
        name: "avatar_timeline",
        strict: true,
        schema: timelineSchema(),
      },
    },
    ...(provider === "openai"
      ? { max_output_tokens: GUIDE_OUTPUT_TOKENS }
      : {}),
  };
}
