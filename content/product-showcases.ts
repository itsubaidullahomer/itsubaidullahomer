export type ProductView = {
  id: string;
  label: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  title: string;
  decision: string;
  sourceLabel: string;
  sourceNote: string;
  focus?: "top";
};

export type ProductShowcaseContent = {
  slug: string;
  name: string;
  theme: "sage" | "violet";
  category: string;
  headline: string;
  summary: string;
  role: string;
  facts: { value: string; label: string }[];
  foundations: string[];
  views: ProductView[];
};

export const productShowcases: Record<string, ProductShowcaseContent> = {
  "insight-x": {
    slug: "insight-x",
    name: "Illume",
    theme: "sage",
    category: "Analytics for MedSpas",
    headline: "From scattered data to useful decisions.",
    summary:
      "I connected booking data to adaptive dashboards, giving practice owners a way to understand their business without writing queries or configuring charts.",
    role: "Full-stack engineer · Dec 2024 — Jun 2025",
    facts: [
      { value: "3", label: "Booking integrations" },
      { value: "4", label: "Dashboard areas" },
    ],
    foundations: [
      "Adaptive chart engine",
      "Platform integrations",
      "Frontend architecture",
    ],
    views: [
      {
        id: "dashboard",
        label: "Dashboard",
        src: "/images/illume/showcase/dashboard.png",
        width: 1600,
        height: 1014,
        alt: "Illume’s public dashboard preview showing revenue, clients, appointments and charts",
        title: "Start with the questions operators ask.",
        decision:
          "I organized dashboards around revenue, bookings, providers and retention, so the interface follows the decisions a practice needs to make.",
        sourceLabel: "Current public preview",
        sourceNote:
          "Dashboard artwork published by Illume. My contribution was the analytics engine, integrations and dashboards during the Insight-X phase; the product has continued to evolve.",
      },
      {
        id: "revenue",
        label: "Revenue",
        src: "/images/illume/showcase/revenue.png",
        width: 1280,
        height: 1040,
        alt: "Illume’s public revenue insight preview with an opportunity and recommended action",
        title: "Make the data useful without manual setup.",
        decision:
          "I built an engine that reads incoming data structures and generates chart logic at runtime, with integrations for Boulevard, Zenoti and Vagaro.",
        sourceLabel: "Current public preview",
        sourceNote:
          "Revenue insight artwork from Illume’s public platform page. Values are illustrative product examples, not measured results of my work.",
      },
      {
        id: "origins",
        label: "Origins",
        src: "/images/illume/showcase/origins.png",
        width: 2561,
        height: 1287,
        alt: "The original Insight-X website before the product became Illume Analytics",
        title: "Own the path from data to interface.",
        decision:
          "My work spanned the analytics engine and the React frontend. Building charts as components gave me control over composition, state and responsive layouts.",
        sourceLabel: "From my project archive",
        sourceNote:
          "The original Insight-X website, preserved from my earlier portfolio. Insight-X later became Illume Analytics.",
      },
    ],
  },
  "ai-humanizer": {
    slug: "ai-humanizer",
    name: "Viloi",
    theme: "violet",
    category: "AI writing product",
    headline: "A writing tool. A complete product.",
    summary:
      "I built Viloi solo, connecting the writing experience, model fallbacks, authentication and subscriptions into a live product with paying customers.",
    role: "Solo build · Design, frontend & backend",
    facts: [
      { value: "3", label: "Model providers in the pipeline" },
      { value: "Solo", label: "Design & engineering" },
    ],
    foundations: [
      "Multi-model fallbacks",
      "Stripe subscriptions",
      "Product design",
    ],
    views: [
      {
        id: "writing",
        label: "Writing",
        src: "/images/viloi/showcase/editor-live.jpg",
        width: 853,
        height: 731,
        alt: "Viloi’s live editor with its built-in sample text on the left and the completed rewrite on the right",
        title: "Retry when one model falls short.",
        decision:
          "I connected OpenAI, Claude and Gemini with fallback routing, so a flagged response can be retried through another model.",
        sourceLabel: "Live editor · demo text",
        sourceNote:
          "Captured from the signed-in Viloi editor in October 2026. The built-in sample was processed once to show a real input and output; this is one example result, not a performance benchmark.",
      },
      {
        id: "controls",
        label: "Controls",
        src: "/images/viloi/showcase/tone-controls-live.jpg",
        width: 853,
        height: 731,
        alt: "Viloi’s editor with the tone selector open, showing Professional, Casual, Academic and Creative options",
        title: "Keep the writing choices close to the text.",
        decision:
          "I kept language, format and tone alongside the editor, so people can shape a rewrite without leaving their text or navigating a separate settings screen.",
        sourceLabel: "Live editor · tone controls",
        sourceNote:
          "The live editor’s tone selector, captured with the same built-in sample and completed result. The card focuses on the controls; this viewer shows the full interface.",
        focus: "top",
      },
      {
        id: "subscriptions",
        label: "Subscriptions",
        src: "/images/viloi/showcase/plans.jpg",
        width: 1269,
        height: 714,
        alt: "Viloi’s subscription interface showing free and paid plans with feature comparisons",
        title: "Build beyond the first successful payment.",
        decision:
          "I used Stripe webhooks for plan changes, cancellations and failed-payment follow-up, so routine subscription changes do not need manual handling.",
        sourceLabel: "Live website capture · Oct 2026",
        sourceNote:
          "Viloi’s public plan comparison, captured in October 2026. This is a view of the subscription experience; current prices are available on viloi.com.",
      },
      {
        id: "origins",
        label: "Origins",
        src: "/images/viloi/showcase/origins.png",
        width: 2559,
        height: 1279,
        alt: "Viloi’s earlier dark website with its robot identity and AI feature cards",
        title: "Give the product a character of its own.",
        decision:
          "I designed the interface alongside the API, authentication and billing, taking responsibility for both how the product feels and how it works.",
        sourceLabel: "From my project archive",
        sourceNote:
          "Viloi’s earlier website and visual identity, preserved from my original portfolio. The live product has since evolved.",
      },
    ],
  },
};
