export const expressions = {
  warm: "A warm, relaxed smile with natural eye contact.",
  amused: "A small amused smile, restrained and friendly.",
  thinking: "A thoughtful expression, slight head tilt.",
  raised_eyebrow: "One gently raised eyebrow, playfully curious.",
  focused: "An attentive, focused expression with steady eye contact.",
  laughing: "A brief natural laugh, then a relaxed smile.",
} as const;
export type Expression = keyof typeof expressions;
