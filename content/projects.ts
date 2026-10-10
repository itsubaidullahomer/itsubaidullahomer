export type Project = {
  slug: string;
  name: string;
  description: string;
  status: string;
  dates: string;
  role: string;
  image: string;
  url: string;
  stack: string[];
};
export const projects: Project[] = [
  {
    slug: "tututor",
    name: "Tututor.ai",
    description:
      "I helped an AI teaching tool grow into a school platform by bringing eight products onto one shared backend and AI into teachers’ everyday work. Now used by 20k+ students, teachers and families.",
    status: "Live",
    dates: "Nov 2023 \u2013 Present",
    role: "Lead engineer, from first rebuild to today",
    image: "/images/tututor/showcase/tututor-catalog.jpg",
    url: "https://tututor.ai",
    stack: [
      "React",
      "Redux Toolkit / RTK Query",
      "Node.js",
      "Express",
      "MongoDB",
      "Socket.io + Redis",
      "React Native",
      "Kotlin Multiplatform",
      "SwiftUI",
      "OpenAI",
      "Claude",
      "Gemini",
      "Stripe",
      "Cloudflare R2",
      "Firebase Cloud Messaging",
    ],
  },
  {
    slug: "insight-x",
    name: "Illume",
    description:
      "I built adaptive dashboards that turn MedSpa booking data into useful business insights, so operators can understand revenue, bookings and retention without writing queries or configuring charts.",
    status: "Live",
    dates: "Dec 2024 \u2013 Jun 2025",
    role: "Full-Stack Engineer (part-time)",
    image: "/images/screens/illume.jpg",
    url: "https://www.joinillume.com/",
    stack: [
      "React",
      "Tailwind CSS",
      "Chart.js",
      "D3.js",
      "OpenAI API",
      "Node.js",
      "Express",
      "MongoDB",
    ],
  },
  {
    slug: "ai-humanizer",
    name: "Viloi",
    description:
      "I built Viloi from the writing experience through to subscription billing, using model fallbacks to handle varied AI output and automated billing to support a product with paying customers.",
    status: "Live",
    dates: "Side project",
    role: "Full-Stack Engineer",
    image: "/images/screens/viloi.jpg",
    url: "https://viloi.com",
    stack: [
      "React",
      "Node.js",
      "Express",
      "MongoDB",
      "OpenAI",
      "Anthropic",
      "Gemini",
      "Stripe",
      "JWT",
    ],
  },
  {
    slug: "ali-foodies",
    name: "Ali Foodies",
    description:
      "A small website rebuild that brings product design, UX, and development together through thoughtful decisions about the customer experience.",
    status: "Building",
    dates: "2026 \u2013 present",
    role: "Product design, UX & development",
    image: "/images/ali-foodies/compare/after-home.jpg",
    url: "https://alifoodies.com",
    stack: [],
  },
  {
    slug: "jurri",
    name: "Jurri",
    description:
      "I brought files, email and a password vault into a consistent frontend, with shared components that made new screens easier for the team to build and familiar for people to use.",
    status: "Live",
    dates: "Sep 2023 \u2013 Apr 2024",
    role: "Frontend Engineer",
    image: "/images/screens/jurri.jpg",
    url: "https://jurri.danzeetech.com/",
    stack: [
      "React",
      "Redux Toolkit",
      "RTK Query",
      "Node.js",
      "Express",
      "MongoDB",
    ],
  },
  {
    slug: "yaksport",
    name: "Yaksport",
    description:
      "I built the search and booking experience around how sports clubs compare camps, keeping their choices intact as they explore options. The platform serves over 100 clubs in Danish and English.",
    status: "Live",
    dates: "Jan 2023 \u2013 Aug 2023",
    role: "Frontend Engineer",
    image: "/images/screens/yaksport.jpg",
    url: "https://yaksport.dk/",
    stack: ["React", "Tailwind CSS", "i18next", "React Router", "REST APIs"],
  },
  {
    slug: "crown-kabab",
    name: "Crown Kabab",
    description:
      "I built a direct ordering experience that connects the customer’s cart, payment and order status, giving the restaurant its own sales channel and customers a clear path from choosing food to tracking it.",
    status: "Shipped",
    dates: "Nov 2022 \u2013 May 2023",
    role: "Full-Stack Engineer",
    image: "/images/screens/crownkabab.png",
    url: "",
    stack: [
      "React",
      "Redux Toolkit",
      "RTK Query",
      "Stripe",
      "Google OAuth",
      "i18next",
    ],
  },
  {
    slug: "animated-landing",
    name: "Animated Landing",
    description:
      "I explored how motion could give a landing page character while keeping it responsive, choosing animation techniques around a performance budget and checking their cost as I built.",
    status: "Shipped",
    dates: "Side project",
    role: "Frontend Engineer",
    image: "/images/screens/enomad.png",
    url: "",
    stack: ["React", "Tailwind CSS", "Framer Motion", "GSAP"],
  },
  {
    slug: "toolkitjar",
    name: "ToolkitJar",
    description:
      "I made everyday text, code and image tasks quick to find and private to use, with free tools grouped by purpose and processing kept in the browser so content doesn’t need to be uploaded.",
    status: "Live",
    dates: "Side project",
    role: "Developer",
    image: "/images/screens/toolkitjar.png",
    url: "https://toolkitjar.com",
    stack: [],
  },
];
