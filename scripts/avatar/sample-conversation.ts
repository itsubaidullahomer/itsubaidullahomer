import { writeFileSync } from "node:fs";
import { sampleConversation } from "../../lib/avatar/conversation";
import { validateCues } from "../../lib/avatar/rig";
import conversation from "../../assets/avatar/ubaid-conversation/conversation.json";
const fps = 24;
const cues = validateCues(conversation.cues);
const frames = Array.from({ length: Math.ceil(conversation.duration * fps) }, (_, frame) => ({ frame: frame + 1, ...sampleConversation(conversation.chapters, cues, frame / fps) }));
writeFileSync("/tmp/ubaid-avatar-tools/conversation-frames.json", JSON.stringify({ fps, frames }));
