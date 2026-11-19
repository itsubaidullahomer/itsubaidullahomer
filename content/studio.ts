/**
 * Every word on the site lives here. Components only render it.
 * In a title, the part between *stars* is set in the italic accent.
 * Written for business owners, so no technical terms and no invented numbers:
 * each figure below is also on the engineering portfolio.
 */

export const studio = {
  /** The name shown on the site. */
  name: "Ubaid",
  /** The full name, used only in the data search engines read. */
  fullName: "Ubaidullah Omer",
  url: "https://itsubaidullahomer.com",
  email: "itsubaidullahomer@gmail.com",
  /** The hiring portfolio that used to be on this domain. */
  engineerUrl: "https://cv.itsubaidullahomer.com",
  title: "Websites, SEO and social media for local businesses",
  description:
    "I build websites, set up Google and run social media for local businesses, so more nearby customers find you and call. One person, start to finish.",
  social: {
    LinkedIn: "https://www.linkedin.com/in/itsubaidullahomer/",
    Instagram: "https://www.instagram.com/itsubaidullahomer",
  },
};

export const hero = {
  eyebrow: ["Web design", "SEO", "Social media", "Ads"],
  /** The headline, one line per entry. "soft" lines are set in grey, "ink" lines in black. */
  title: [
    ["Websites,", "soft"],
    ["SEO & social", "soft"],
    ["that bring you", "ink"],
    ["more customers.", "ink"],
  ] as [string, "soft" | "ink"][],
  lede: "I build websites, get local businesses found on Google and run their social media. One person, from start to finish.",
  primary: "Get in touch",
  secondary: "See my work",
  /** The words around the turning badge on the portrait. */
  badge: "Web design • SEO • Social media • Ads • ",
  /** A real piece of work, shown as a small moving preview. */
  peek: {
    src: "/images/ali-foodies/compare/after-home.jpg",
    width: 780,
    height: 4600,
    label: "Latest: Ali’s Foodies",
    href: "#before-after",
  },
  stat: { value: 20, suffix: "k+", label: "people use what I’ve built" },
};

export const tape = ["Websites", "Google Maps", "Local SEO", "Social media", "Ads", "Logos", "Reviews", "Online booking"];

/** The words on the gold strip that runs down the hero. */
export const strip = ["Web design", "SEO", "Social media", "Branding", "Ads"];

export const intro = {
  kicker: "Who I am",
  /** Lights up word by word as it is read. */
  statement:
    "I’m Ubaid. I build websites, get local businesses found on Google and run their social media, so more of the right customers find you and call.",
  points: ["One person, from start to finish.", "A fixed quote before any work starts.", "You deal with me directly."],
  stats: [
    { value: 4, suffix: "", label: "years building for the web" },
    { value: 8, suffix: "", label: "products launched" },
    { value: 20, suffix: "k+", label: "people using what I’ve built" },
  ],
};

/**
 * The words inside the small moving screens on the service cards. They are drawings of a search page,
 * a website, a post and so on for a made-up business; on a /for/… link the business name is the visitor's.
 */
export const sample = {
  business: "Your Business",
  domain: "yourbusiness.com",
  query: "plumber near me",
  /** A word in a business name picks a closer search than the default one. */
  queries: [
    ["septic", "septic service near me"],
    ["roof", "roof repair near me"],
    ["hvac|heating|cooling|air", "ac repair near me"],
    ["lawn|landscap|tree|garden", "lawn care near me"],
    ["clean|maid", "house cleaning near me"],
    ["electric", "electrician near me"],
    ["auto|tire|mechanic|brake", "auto repair near me"],
    ["dent", "dentist near me"],
    ["salon|barber|spa", "hair salon near me"],
    ["restaurant|pizza|grill|cafe|kitchen|food", "best food near me"],
  ] as [string, string][],
  others: ["Another Company", "Someone Else Ltd"],
  site: { headline: "Fast, friendly service near you.", line: "Local, on time and easy to reach.", call: "Call now", quote: "Get a quote", toast: "Incoming call" },
  post: { text: "Another job finished this morning.", tag: "Job done", comment: "Great work, thank you!", likes: 128 },
  ad: { tag: "Sponsored", line: "Call today. Local and on time.", call: "Call", chart: "Calls this week", chip: "New call" },
  card: { line: "Local services", swatches: ["#121110", "#c8922a", "#f6ead0", "#ffffff"] },
  care: { state: "Online", checks: ["Updates installed", "Backup saved", "Phone number changed"] },
};

export type Service = {
  key: "web" | "seo" | "social" | "ads" | "brand" | "care";
  name: string;
  title: string;
  text: string;
  points: string[];
};

export const services = {
  kicker: "What I do",
  title: "Everything it takes to get found, trusted *and called.*",
  list: [
    {
      key: "web",
      name: "Websites",
      title: "A website that sells while you work.",
      text: "Fast, clear and easy to use on a phone. Your number and a call button are always in reach.",
      points: ["New websites", "Redesigns", "Landing pages"],
    },
    {
      key: "seo",
      name: "Google & local SEO",
      title: "Be the name they find.",
      text: "Your Google Business Profile, Maps listing and the right words on your pages, so nearby customers can find you.",
      points: ["Google Business Profile", "Maps", "Reviews"],
    },
    {
      key: "social",
      name: "Social media",
      title: "Look alive online.",
      text: "Posts, stories and replies on Facebook and Instagram, handled for you every week.",
      points: ["Facebook", "Instagram", "Replies"],
    },
    {
      key: "ads",
      name: "Ads",
      title: "Turn up the calls when you want a busier week.",
      text: "Google and Facebook ads aimed at people in your area, on a budget you set.",
      points: ["Google Ads", "Facebook Ads", "Monthly report"],
    },
    {
      key: "brand",
      name: "Logo & branding",
      title: "Look like the pros you are.",
      text: "A logo, colours and printed pieces that match, from business cards to the side of the truck.",
      points: ["Logos", "Business cards", "Flyers"],
    },
    {
      key: "care",
      name: "Care plan",
      title: "I look after it. You run the business.",
      text: "Hosting, updates, fixes and small changes. You never have to log in to anything.",
      points: ["Hosting", "Updates", "Small changes"],
    },
  ] satisfies Service[],
  moreTitle: "Also on the menu",
  more: [
    ["Online booking", "Quote forms", "Review requests", "Email newsletters", "Photo galleries", "Price lists"],
    ["Chat assistant for your site", "Business email", "Domain setup", "Copywriting", "Monthly reports", "Menus"],
  ],
};

export const compare = {
  kicker: "A real one",
  title: "Before. *After.*",
  name: "Ali’s Foodies",
  place: "Food truck · Mercer Island, Washington",
  text: "Same truck, same food. Now the first thing a hungry customer sees is how to order.",
  before: { src: "/images/ali-foodies/compare/before-home.jpg", width: 664, height: 4032, label: "Before" },
  /**
   * Captured from the live site with scripts/capture-ali.mjs. The site keeps its top bar and its bottom
   * tab bar fixed on screen, so the phone pins them too: `head` is the height of the top bar in the
   * capture, and `nav` is the tab bar, captured on its own.
   */
  after: {
    src: "/images/ali-foodies/compare/after-home.jpg",
    width: 780,
    height: 4600,
    label: "After",
    head: 112,
    nav: { src: "/images/ali-foodies/compare/after-nav.png", width: 780, height: 126 },
  },
  hint: "Drag the handle",
};

export type Shot = { src: string; width: number; height: number };
export type WorkItem = {
  key: string;
  name: string;
  kind: string;
  line: string;
  url?: string;
  frame: "browser" | "phones";
  shots: Shot[];
  /** A tall capture that slides up inside its frame as the card passes. */
  pan?: boolean;
};

export const work = {
  kicker: "Work",
  title: "Things I’ve built that people *use every day.*",
  /** The two giant words that slide apart before the cards arrive. */
  split: ["Recent", "work"],
  items: [
    {
      key: "tututor",
      name: "Tututor",
      kind: "Online school platform",
      line: "Used by 20,000+ students, teachers and families.",
      url: "https://tututor.ai",
      frame: "browser",
      shots: [{ src: "/images/tututor/showcase/tututor-catalog.jpg", width: 1600, height: 757 }],
    },
    {
      key: "apps",
      name: "Tututor apps",
      kind: "Phone apps",
      line: "Three apps, in the App Store and on Google Play.",
      frame: "phones",
      shots: [
        { src: "/images/tututor/mobile/familias-tareas.jpg", width: 720, height: 1557 },
        { src: "/images/tututor/mobile/alumnos-home.jpg", width: 720, height: 1557 },
        { src: "/images/tututor/mobile/profesores-horario.jpg", width: 720, height: 1557 },
      ],
    },
    {
      key: "illume",
      name: "Illume",
      kind: "Dashboard for med spas",
      line: "Turns a week of bookings into numbers an owner can read at a glance.",
      url: "https://www.joinillume.com/",
      frame: "browser",
      shots: [{ src: "/images/illume/showcase/dashboard.png", width: 1600, height: 1014 }],
    },
    {
      key: "yaksport",
      name: "Yaksport",
      kind: "Booking website",
      line: "Sports camps, compared and booked online. Used by 100+ clubs.",
      url: "https://yaksport.dk/",
      frame: "browser",
      pan: true,
      shots: [{ src: "/images/screens/yaksport.jpg", width: 2160, height: 5400 }],
    },
    {
      key: "crown",
      name: "Crown Kabab",
      kind: "Online ordering for a takeaway",
      line: "From the menu to the payment to “your order is on its way”.",
      frame: "browser",
      shots: [{ src: "/images/screens/crownkabab.png", width: 2544, height: 1288 }],
    },
    {
      key: "viloi",
      name: "Viloi",
      kind: "Writing app",
      line: "A subscription product with paying customers.",
      url: "https://viloi.com",
      frame: "browser",
      pan: true,
      shots: [{ src: "/images/screens/viloi.jpg", width: 2160, height: 7800 }],
    },
  ] satisfies WorkItem[],
  last: { title: "Yours next?", text: "Tell me what you do. I’ll tell you what I’d build.", cta: "Start with an email" },
};

/** Three lines of very large type that slide in opposite directions. The second word of each is set in italics. */
export const band = [
  ["This website is", "the sample."],
  ["Yours can feel", "like this."],
  ["Fast on a phone,", "good to scroll."],
];

export const process = {
  kicker: "Working together",
  title: "Four steps. *No surprises.*",
  /** The very large word behind the steps. */
  ghost: "Steps",
  steps: [
    { title: "We talk.", text: "A short call. You tell me about the business and what’s not working." },
    { title: "You get a plan.", text: "What I’d build, what it costs and how long it takes. A fixed quote, in writing, before anything starts." },
    { title: "I build. You react.", text: "You see it early and tell me what to change. Nothing technical to learn." },
    { title: "We go live.", text: "Then I stay around to keep it working and keep it fresh." },
  ],
};

export const faq = {
  kicker: "Good questions",
  title: "Before *you ask.*",
  list: [
    [
      "How much does it cost?",
      "It depends on what you need, so I don’t guess. You get a fixed quote in writing before anything starts, and if the plan changes we talk about the cost first.",
    ],
    [
      "How long does it take?",
      "That depends on the size of the job. The timeline comes with the quote, so you know before you say yes.",
    ],
    [
      "I already have a website. Do I have to start over?",
      "No. I start with what already works. Sometimes a few fixes and a proper Google profile do more than a rebuild.",
    ],
    [
      "Do I need to know anything technical?",
      "No. Domain, hosting, Google, logins: I set it all up and explain it in plain English.",
    ],
    [
      "What happens after it goes live?",
      "We agree that up front too. I can hand everything over, or keep looking after the site, the posts and the ads month to month.",
    ],
    [
      "How do we stay in touch?",
      "Directly with me, by email, phone or video call. Decisions go in writing so nothing gets lost.",
    ],
  ] as [string, string][],
};

export const contact = {
  kicker: "Your turn",
  title: { before: "Let’s get you", accent: "found." },
  /** The giant line that runs across the top of the panel. */
  shout: "Let’s talk",
  text: "Tell me what you need. I’ll reply with what I’d do and what it would cost.",
  needLabel: "I need help with",
  needs: ["A website", "Google & SEO", "Social media", "Ads", "Logo & branding", "Not sure yet"],
  nameLabel: "Business name",
  noteLabel: "Anything else? (optional)",
  send: "Write the email for me",
  copy: "Copy my email address",
  copied: "Copied",
  reply: "Already have an email from me? Just hit reply.",
};

export const footer = {
  line: "Websites, Google and social media for local businesses.",
  hiring: "Hiring an engineer? See my engineering portfolio",
};
