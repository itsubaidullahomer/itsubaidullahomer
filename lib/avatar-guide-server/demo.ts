import { SITE_INDEX, type TimelineAction } from "./timeline";
import type { SiteTarget } from "./site-index-types";

function presentation(target: SiteTarget, text: string): TimelineAction[] {
  return [
    { type: "react", emotion: "warm_smile", intensity: 0.5, gesture: "nod" },
    { type: "navigate", sectionId: target.sectionId },
    { type: "point", selector: target.selector },
    {
      type: "say",
      text,
      emotion: target.kind === "project" ? "proud" : "warm_smile",
      intensity: 0.55,
      gestures: [{ atWord: 2, name: "open_palm_present" }],
    },
  ];
}
const aliases: [RegExp, string][] = [
  [/tututor|school|teaching/, "project-tututor"],
  [/illume|insight.?x|medspa|analytics/, "project-insight-x"],
  [/viloi|humaniz|writing tool/, "project-ai-humanizer"],
  [/ali.?food|small project/, "project-ali-foodies"],
  [/jurri|vault|inbox/, "project-jurri"],
  [/yaksport|sports? club|camp/, "project-yaksport"],
  [/crown|kabab|restaurant|ordering/, "project-crown-kabab"],
  [/animated.?landing|animation|motion/, "project-animated-landing"],
  [/toolkit.?jar|free tool|privacy/, "project-toolkitjar"],
  [/experien|career|danzee/, "experience"],
  [/price|pricing|payment|cost|quote/, "pricing"],
  [/contact|email|hire|book|call you/, "contact"],
  [/process|work together|communicat|progress|feedback/, "process"],
  [/support|after launch/, "process-care"],
  [/skill|stack|technolog|tools.*use/, "skills"],
  [/mobile|react native|swift|kotlin/, "service-mobile"],
  [/voice|interrupt|speech/, "voice-lab"],
  [/stream|latency/, "streaming-lab"],
  [/architect|backend|database/, "architecture-lab"],
  [/experiment|playground/, "experiments"],
  [/service|help me|take over|rebuild/, "services"],
  [/learn|currently|working on|now/, "now"],
  [/writing|article|blog|client.*code/, "writing"],
  [/about|yourself|who are|where|pakistan|remote|timezone/, "about"],
  [/project|portfolio|built|work|tour|show me/, "work"],
];
export function demoTimeline(message: string): TimelineAction[] {
  const q = message.toLowerCase();
  const greeting = /^(hi|hello|hey|good (morning|evening))[!.\s]*$/.test(
    q.trim(),
  );
  const id = greeting
    ? "home"
    : aliases.find(([pattern]) => pattern.test(q))?.[1];
  if (!id)
    return [
      {
        type: "react",
        emotion: "curious",
        intensity: 0.35,
        gesture: "head_tilt",
      },
      {
        type: "say",
        text: "I can walk you through my projects, engineering approach, skills or how to get in touch. Which part would you like to explore?",
        emotion: "warm_smile",
        intensity: 0.45,
        gestures: [],
      },
    ];
  const target = SITE_INDEX.find((item) => item.sectionId === id)!;
  let text = target.summary;
  if (id === "home")
    text =
      "Hi, I’m Ubaid’s portfolio guide. I can show you the projects and the decisions behind them; this preview uses authored answers and a standard browser voice.";
  else if (id === "work")
    text =
      "I’ve built AI products, analytics tools, web apps and mobile apps. Tututor, Illume, Viloi and Ali Foodies show different sides of that work. Pick a project and I’ll explain the decisions behind it.";
  else if (id === "skills")
    text = `I work with ${target.keyFacts.slice(0, 6).join(", ")}, along with mobile and AI tools. I choose the stack around the product’s needs.`;
  else if (id === "experience")
    text =
      "I started at Danzee Tech in 2022 and became lead engineer at Tututor. My work grew from frontend features to shared backend architecture, AI integrations and mobile apps.";
  else if (id === "contact")
    text = `You can email me at ${target.keyFacts[0]} or use the booking button here. Tell me about the product, what needs to change and your timeline.`;
  else if (id === "now")
    text = `These workbench notes were last updated on ${target.keyFacts[0].replace("Content last updated: ", "")}. They cover Tututor, conversation reviews and this portfolio; I wouldn’t treat that date as a live availability update.`;
  else if (target.kind === "project")
    text = `${target.summary} My role was ${target.keyFacts[0]}.`;
  else
    text = `${text} I can show you a relevant project if you’d like a concrete example.`;
  return presentation(target, text);
}
export const API_FALLBACK: TimelineAction[] = [
  { type: "react", emotion: "embarrassed", intensity: 0.25, gesture: "shrug" },
  {
    type: "say",
    text: "My connection stumbled. You can still explore the authored project tour, or contact the real me through the site.",
    emotion: "warm_smile",
    intensity: 0.4,
    gestures: [],
  },
];
