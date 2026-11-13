/** Copy for the home page. Components only render it. Every number here is also stated on a case study or the About page. */

export const hero = {
  status: ["Open to full-time roles", "Remote", "UTC+5"],
  title: [
    ["I", "build", "AI"],
    ["products", "people"],
    ["actually", "use."],
  ],
  /** Words in the last line are set in the softer slate colour. */
  softLine: 2,
  resume: "/Ubaidullah-CV.pdf",
};

export const stats = [
  { value: 4, suffix: "", label: "years building products, remotely" },
  { value: 8, suffix: "", label: "products running on one backend I designed" },
  { value: 20, suffix: "k+", label: "students, teachers and families using them" },
  { value: 1000, prefix: "~", suffix: "", label: "API endpoints across about 90 data models" },
];

/** The five beats of the pinned scene. `cursor` is what the pointer is labelled while it does that job. */
export const buildSteps = [
  {
    key: "product",
    cursor: "product",
    title: "Think it through",
    text: "Who it is for, what the first click is, and what happens when something fails. Decided before any code.",
  },
  {
    key: "frontend",
    cursor: "frontend",
    title: "Build the interface",
    text: "React and TypeScript, with the loading, empty and error states built in from the start.",
  },
  {
    key: "backend",
    cursor: "backend",
    title: "Write the backend",
    text: "One Express and MongoDB backend, about 1,000 endpoints on 90 models, serving eight products.",
  },
  {
    key: "ai",
    cursor: "AI",
    title: "Make the AI dependable",
    text: "Every AI call and API key lives on the server. Streaming, retries and failure states are part of the feature.",
  },
  {
    key: "ship",
    cursor: "shipping",
    title: "Ship it. Keep it running.",
    text: "Three mobile apps in both stores, and 20k+ students, teachers and families using the platform.",
  },
] as const;

export const buildNotes = ["Who is this for?", "What is the first click?", "What happens when it fails?", "What can we leave out?"];
export const buildComponents = ["Sidebar", "SearchBar", "PromptChips", "ToolGroup", "ToolCard"];
export const buildStates = ["loading", "empty", "error", "retry"];
export const buildServices = ["MongoDB · ~90 models", "Redis · Socket.io", "R2 storage", "Stripe · SEPA"];
export const buildModels = ["OpenAI", "Claude", "Gemini"];
export const buildAiRules = ["Runs on the server", "Streams as it writes", "Retries a dropped reply", "Keys never reach the client"];

/** The band of large words that slides sideways as the page scrolls: everything one person covers. */
export const band = ["Product", "Frontend", "Backend", "Mobile", "AI"];

/** The short bio that lights up as it is read. Each sentence is on the About page in longer form. */
export const statement =
  "I’m self-taught. I started as a junior in 2022, building React interfaces for a team in Denmark. Then one bug fix at Tututor became three rebuilds, a backend I had to learn to write, and the API that now serves eight products. Most teams I’ve worked with had no designer and no product manager for every feature, so I learned to think beyond the code.";

export const timeline = [
  {
    company: "Tututor.ai / EduNova",
    logo: "/logos/tututor.png",
    role: "Lead Engineer",
    dates: "Nov 2023 — Present",
    place: "Murcia, Spain · Remote",
    current: true,
    text: "One bug fix became three rebuilds, eight products, and a platform used by 20k+ students, teachers and families.",
    details: [
      "Designed an Express and MongoDB backend with ~1,000 endpoints on ~90 models. Moved every AI call and API key off the client.",
      "Built school-scoped data, Socket.io + Redis messaging, R2 storage, Stripe and SEPA billing.",
      "Shipped three React Native apps to both stores. Started a Kotlin Multiplatform core with SwiftUI and Jetpack Compose.",
      "Led three app developers and a couple of web developers. Taught the founder to code; today the two of us run the product.",
    ],
    href: "/work/tututor",
  },
  {
    company: "Illume",
    logo: "/logos/illume.png",
    role: "Full-Stack Engineer, part-time",
    dates: "Dec 2024 — Jun 2025",
    place: "Remote",
    current: false,
    text: "Built adaptive dashboards that turn MedSpa booking data into answers about revenue, bookings and retention. The company went on to raise $250k.",
    details: [],
    href: "/work/insight-x",
  },
  {
    company: "Danzee Tech",
    logo: "/logos/danzee.png",
    role: "React Developer",
    dates: "Jan 2022 — Jan 2024",
    place: "Viby, Denmark · Remote",
    current: false,
    text: "Joined as a junior. Became the person the team handed new features to, from shared frontend components to auth and payments.",
    details: [
      "Built the reusable component and hooks library used across new screens.",
      "Shipped Jurri’s file uploads, unified inbox and password vault. Cut initial load by about 40% with code splitting and lazy loading.",
      "Fixed query and indexing hotspots, and built Node and Express integrations.",
    ],
    href: "/work/jurri",
  },
];

export const toolbox = [
  { group: "Frontend", items: ["React", "Next.js", "TypeScript"] },
  { group: "Backend", items: ["Node.js", "Express", "MongoDB", "Redis", "Postgres"] },
  { group: "Mobile", items: ["React Native", "Kotlin Multiplatform", "SwiftUI"] },
  { group: "AI", items: ["OpenAI", "Claude", "Gemini", "ElevenLabs"] },
  { group: "Payments", items: ["Stripe"] },
];

/** What someone hiring needs before they write back. */
export const shortVersion = [
  ["Now", "Lead Engineer at Tututor.ai"],
  ["Experience", "4 years, always remote, with teams in Spain and Denmark"],
  ["Based", "Rahim Yar Khan, Pakistan · UTC+5"],
  ["Hours", "European working day. US overlap by agreement"],
  ["Works across", "Product, frontend, backend, mobile and AI"],
];

/** How each featured project is shown on the home page. Everything else comes from content/projects.ts. */
export const featured: Record<string, { image?: string; tint: string; pan?: boolean; url?: string }> = {
  tututor: { tint: "#eef3fb" },
  "insight-x": { image: "/images/illume/showcase/dashboard.png", tint: "#eef5f0" },
  "ai-humanizer": { tint: "#f3eef9", pan: true },
  "ali-foodies": { tint: "#faf4ea", pan: true },
};
