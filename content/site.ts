/** Everything the page says lives here. Components only render it. */

export const site = {
  name: "Ubaidullah Omer",
  shortName: "Ubaid",
  role: "Web developer",
  location: "Rahim Yar Khan, Pakistan",
  timeZone: "Asia/Karachi",
  utcOffset: 5,
  email: "itsubaidullahomer@gmail.com",
  /** Where this site is meant to live. Canonical URLs and share images are built from it. */
  url: "https://creative.itsubaidullahomer.com",
  mainSite: "https://itsubaidullahomer.com",
  cv: "https://itsubaidullahomer.com/Ubaidullah-CV.pdf",
  title: "Ubaidullah Omer — Web developer who ships",
  description:
    "I ship websites, web apps and AI products. Lead engineer behind Tututor.ai: eight products on one backend, used by 20k+ students, teachers and families.",
  social: {
    GitHub: "https://github.com/itsubaidullahomer",
    LinkedIn: "https://www.linkedin.com/in/itsubaidullahomer/",
    Instagram: "https://www.instagram.com/itsubaidullahomer",
  },
};

export const nav = [
  { href: "#manifest", label: "Manifest" },
  { href: "#tracking", label: "Tracking" },
  { href: "#handling", label: "Handling" },
  { href: "#pickup", label: "Pickup" },
];

export const stats = [
  { value: "04", label: "years shipping" },
  { value: "09", label: "products delivered" },
  { value: "20k+", label: "people on the receiving end" },
];

/** The customs form in the sender section. */
export const declaration = [
  { item: "Frontend", detail: "React, Next.js, TypeScript" },
  { item: "Backend", detail: "Node.js, Express, MongoDB, Redis, Postgres" },
  { item: "Mobile", detail: "React Native, Kotlin Multiplatform, SwiftUI" },
  { item: "AI", detail: "OpenAI, Claude, Gemini, ElevenLabs" },
  { item: "Payments", detail: "Stripe" },
];

export type Parcel = {
  slug: string;
  name: string;
  tagline: string;
  contents: string;
  deliveredTo: string;
  handledBy: string;
  dates: string;
  route: string[];
  status: "delivered" | "transit";
  url: string;
  urlLabel: string;
  image: string;
  imageAlt: string;
  device: "browser" | "phone";
  /** A second shot: a phone over the browser, or the "before" of a rebuild. */
  extra?: { image: string; alt: string };
};

/** The four parcels that come out of the box, in order. */
export const parcels: Parcel[] = [
  {
    slug: "tututor",
    name: "Tututor.ai",
    tagline: "A small tool. Then a whole school platform.",
    contents:
      "Eight products on one shared backend: AI tools for teachers, a document editor, school administration and three mobile apps.",
    deliveredTo: "20k+ students, teachers and families",
    handledBy: "Lead engineer",
    dates: "Nov 2023 — present",
    route: ["React", "Node.js", "MongoDB", "React Native", "OpenAI"],
    status: "delivered",
    url: "https://tututor.ai",
    urlLabel: "tututor.ai",
    image: "/work/tututor.jpg",
    imageAlt: "Tututor's AI tools for teachers, grouped by the job they came to do",
    device: "browser",
    extra: {
      image: "/work/tututor-mobile.jpg",
      alt: "The Tututor families app showing a child's homework",
    },
  },
  {
    slug: "insight-x",
    name: "Illume",
    tagline: "From scattered data to useful decisions.",
    contents:
      "Adaptive dashboards that turn MedSpa booking data into answers about revenue, bookings and retention.",
    deliveredTo: "MedSpa owners and operators",
    handledBy: "Full-stack engineer, part-time",
    dates: "Dec 2024 — Jun 2025",
    route: ["React", "D3.js", "Node.js", "MongoDB", "OpenAI"],
    status: "delivered",
    url: "https://www.joinillume.com/",
    urlLabel: "joinillume.com",
    image: "/work/illume.jpg",
    imageAlt: "Illume's dashboard with revenue, clients, appointments and charts",
    device: "browser",
  },
  {
    slug: "ai-humanizer",
    name: "Viloi",
    tagline: "A writing tool. A complete product.",
    contents:
      "An AI writing product, built solo: the editor, model fallbacks, sign-in and subscription billing.",
    deliveredTo: "Paying customers",
    handledBy: "Solo: design, frontend and backend",
    dates: "Side project",
    route: ["React", "Node.js", "OpenAI", "Claude", "Stripe"],
    status: "delivered",
    url: "https://viloi.com",
    urlLabel: "viloi.com",
    image: "/work/viloi.jpg",
    imageAlt: "Viloi's landing page",
    device: "browser",
  },
  {
    slug: "ali-foodies",
    name: "Ali Foodies",
    tagline: "A food truck's website, made for the phone.",
    contents:
      "A mobile-first redesign and rebuild: ordering up front, a menu made for thumbs, hours and location in easy reach.",
    deliveredTo: "Customers ordering from their phones",
    handledBy: "Product design, UX and development",
    dates: "2026 — present",
    route: ["Product design", "UX", "Development"],
    status: "transit",
    url: "https://alifoodiess.vercel.app",
    urlLabel: "Preview",
    image: "/work/ali-foodies-after.jpg",
    imageAlt: "Ali Foodies' new mobile website",
    device: "phone",
    extra: {
      image: "/work/ali-foodies-before.jpg",
      alt: "Ali Foodies' previous website on a phone",
    },
  },
];

/** Older parcels, listed as a manifest. ToolkitJar's tool count is never stated: it keeps growing. */
export const archive = [
  {
    slug: "jurri",
    name: "Jurri",
    contents: "Files, email and a password vault in one consistent frontend.",
    role: "Frontend engineer",
    dates: "2023 — 2024",
    status: "Delivered",
    image: "/work/jurri.jpg",
  },
  {
    slug: "yaksport",
    name: "Yaksport",
    contents: "Search and booking for sports camps, used by 100+ clubs in Danish and English.",
    role: "Frontend engineer",
    dates: "2023",
    status: "Delivered",
    image: "/work/yaksport.jpg",
  },
  {
    slug: "crown-kabab",
    name: "Crown Kabab",
    contents: "Direct ordering for a restaurant: cart, payment and order status.",
    role: "Full-stack engineer",
    dates: "2022 — 2023",
    status: "Delivered",
    image: "/work/crown-kabab.jpg",
  },
  {
    slug: "animated-landing",
    name: "Animated Landing",
    contents: "A landing page with character, built to a performance budget.",
    role: "Frontend engineer",
    dates: "Side project",
    status: "Delivered",
    image: "/work/animated-landing.jpg",
  },
  {
    slug: "toolkitjar",
    name: "ToolkitJar",
    contents: "Free text, code and image tools that run in the browser, so nothing is uploaded.",
    role: "Developer",
    dates: "Side project",
    status: "Delivered",
    image: "/work/toolkitjar.jpg",
  },
];

export const tracking = [
  {
    date: "Nov 2023 — now",
    place: "Tututor.ai / EduNova",
    where: "Murcia, Spain · Remote",
    status: "Out for delivery",
    current: true,
    role: "Lead engineer",
    text: "One bug fix became three rebuilds, eight products, and a platform used by 20k+ students, teachers and families.",
    details: [
      "Designed an Express and MongoDB backend with ~1,000 endpoints on ~90 models. Moved every AI call and API key off the client.",
      "Built school-scoped data, Socket.io and Redis messaging, R2 storage, Stripe and SEPA billing.",
      "Shipped three React Native apps to both stores.",
      "Led three app developers and a couple of web developers. Taught the founder to code; today the two of us run the product.",
    ],
  },
  {
    date: "Dec 2024 — Jun 2025",
    place: "Illume",
    where: "Part-time contract · Remote",
    status: "Delivered",
    role: "Full-stack engineer",
    text: "Connected booking data to adaptive dashboards, so practice owners can understand their business without writing queries. That work helped the company raise $250k.",
    details: [],
  },
  {
    date: "Jan 2022 — Jan 2024",
    place: "Danzee Tech",
    where: "Viby, Denmark · Remote",
    status: "Delivered",
    role: "React developer",
    text: "Joined as a junior. Became the person the team handed new features to, from shared frontend components to auth and payments.",
    details: [
      "Built the reusable component and hooks library used across new screens.",
      "Shipped Jurri's file uploads, unified inbox and password vault. Cut initial load by about 40% with code splitting and lazy loading.",
      "Fixed query and indexing hotspots, and built Node and Express integrations.",
    ],
  },
  {
    date: "2022",
    place: "Rahim Yar Khan, Pakistan",
    where: "Origin",
    status: "Label created",
    role: "Self-taught",
    text: "I learned by building. Most of the startups I worked with had no designer and no product manager for every feature, so I learned to think beyond the code.",
    details: [],
  },
];

export const handling = [
  {
    icon: "fragile",
    mark: "Fragile",
    title: "Your product handles the unexpected.",
    text: "I plan for loading, errors and retries, so people know what's happening and can keep going when something fails.",
  },
  {
    icon: "tracked",
    mark: "Tracked",
    title: "You see progress as it happens.",
    text: "You get regular updates and working previews. We review the product together and use your feedback to decide what comes next.",
  },
  {
    icon: "up",
    mark: "This side up",
    title: "You get a product ready for real users.",
    text: "I test the important flows, check performance and handle deployment, so the product works beyond the demo.",
  },
  {
    icon: "dry",
    mark: "Keep covered",
    title: "You have support after launch.",
    text: "After launch, I help improve the flows people use every day, with attention to feedback, real devices and changing needs.",
  },
] as const;

export const services = [
  {
    code: "EXP",
    speed: "Express",
    name: "Landing page",
    description: "A clear story. A fast page. Details that feel considered.",
    includes: ["Design and development", "Responsive layouts and motion", "SEO and deployment"],
  },
  {
    code: "FRT",
    speed: "Freight",
    name: "Product build",
    description: "From the first data model to the feature your customers use.",
    includes: ["Full-stack product engineering", "AI, payments and integrations", "Production handoff"],
  },
  {
    code: "STD",
    speed: "Standing order",
    name: "Ongoing engineering",
    description: "An engineer who knows the product and keeps moving it forward.",
    includes: ["Features and product iterations", "Performance and reliability", "A direct working relationship"],
  },
];

export const faqs: [string, string][] = [
  [
    "What do you build with?",
    "Usually React, Next.js and TypeScript on the frontend; Node, Express and MongoDB on the backend. For AI, I use OpenAI, Claude, Gemini and ElevenLabs according to the job. Mobile work spans React Native and native interfaces.",
  ],
  [
    "Can you work with a team in Europe or the US?",
    "I'm in Pakistan, UTC+5, and already work remotely with teams in Spain and Denmark. We can agree on overlap with your working day, including US hours, before we start.",
  ],
  [
    "How will we stay in touch?",
    "Directly with me. We'll agree on a shared channel, keep decisions in writing, and review working previews as the project develops.",
  ],
  [
    "How long does a project take?",
    "That depends on the scope and the state of the existing product. Send me what you have and what needs to change; I'll propose milestones before we commit to a timeline.",
  ],
  [
    "Can you take over an existing app?",
    "Yes. I've rebuilt Tututor three times and worked through migrations, slow APIs and fragile AI flows. I start by understanding what already works and where the real constraints are.",
  ],
  [
    "What happens after launch?",
    "We can include handoff, documentation and a defined support period in the scope, or work together on ongoing engineering. We'll agree on this before the build.",
  ],
  [
    "How do pricing and payments work?",
    "I quote against an agreed scope. Payment milestones and any ongoing work are agreed before we start. If the scope changes, we discuss the effect on cost and timing first.",
  ],
];
