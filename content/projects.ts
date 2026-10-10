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
      "An AI tool for teachers that I rebuilt three times and grew into a school platform: eight products, one backend, 20k+ users.",
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
      "Business analytics for MedSpas that builds its own dashboards from whatever data you connect. Live today as Illume Analytics.",
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
      "A writing tool at viloi.com that rewrites machine-generated text so it reads naturally. Multi-model pipeline, Stripe billing, built solo.",
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
      "Rebuilding Ali Foodies' website for the phone, because that's where almost every customer finds it.",
    status: "Building",
    dates: "2026 \u2013 present",
    role: "Redesign and rebuild",
    image: "/images/ali-foodies/compare/after-home.jpg",
    url: "https://alifoodies.com",
    stack: [],
  },
  {
    slug: "jurri",
    name: "Jurri",
    description:
      "Cloud storage, a unified inbox and a password vault in one app for enterprise teams.",
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
      "Booking platform for Danish sports clubs looking for training camps abroad. Over 100 clubs use it.",
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
      "Ordering site for a restaurant, with Stripe checkout, Google sign-in and Danish/English support.",
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
      "A landing page built to find out how much motion I could add before the Lighthouse score dropped.",
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
      "A free online tools website I built, with tools for text, SEO, code and images, including a text compare tool, a word counter and a JSON formatter. Everything runs in the browser, so nothing is uploaded.",
    status: "Live",
    dates: "Side project",
    role: "Developer",
    image: "/images/screens/toolkitjar.png",
    url: "https://toolkitjar.com",
    stack: [],
  },
];
