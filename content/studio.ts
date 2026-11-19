/**
 * Every word on the site lives here. Components only render it.
 * In a title, the part between *stars* is set in the italic accent.
 * Written for business owners, so no technical terms and no invented numbers:
 * each figure below is also on the engineering portfolio.
 */

export const studio = {
  name: "Ubaidullah Omer",
  short: "Ubaid",
  url: "https://itsubaidullahomer.com",
  email: "itsubaidullahomer@gmail.com",
  /** The hiring portfolio that used to be on this domain. */
  engineerUrl: "https://cv.itsubaidullahomer.com",
  title: "Websites, Google and social media for local businesses",
  description:
    "I build websites, set up Google and run social media for local businesses, so more nearby customers find you and call. One person, start to finish.",
  social: {
    LinkedIn: "https://www.linkedin.com/in/itsubaidullahomer/",
    Instagram: "https://www.instagram.com/itsubaidullahomer",
  },
};

export const hero = {
  eyebrow: ["Web design", "SEO", "Social media", "Ads"],
  /** The headline, in three parts. The middle word sits in a search bar. */
  title: { before: "Your next customer is", search: "searching", after: "right now." },
  lede: "Let’s make sure they find you. Websites, Google and social media for local businesses, handled from start to finish.",
  primary: "See how it works",
  secondary: "Email me",
  role: "Web design & marketing",
  /** Small labels that drift around the portrait. */
  chips: ["Web design", "Local SEO", "Social media", "Google Ads"],
  /** Real work shown as the two cards behind the portrait. */
  fan: [
    { src: "/images/ali-foodies/compare/after-home.jpg", width: 664, height: 3861 },
    { src: "/images/tututor/mobile/alumnos-home.jpg", width: 720, height: 1557 },
  ],
};

export const tape = ["Websites", "Google Maps", "Local SEO", "Social media", "Ads", "Logos", "Reviews", "Online booking"];

/** The kind of business the demo phone shows. `match` words pick one from a business name. */
export type Trade = {
  key: string;
  label: string;
  match: string[];
  query: string;
  headline: string;
  jobs: [string, string, string];
  review: string;
  post: string;
  ad: string;
};

export const trades: Trade[] = [
  {
    key: "septic",
    label: "Septic",
    match: ["septic", "sewer", "pumping"],
    query: "septic pumping near me",
    headline: "Septic pumping without the wait.",
    jobs: ["Pumping", "Inspections", "Repairs"],
    review: "Came out the same day. Fair price, no mess.",
    post: "Slow drains this week? We’re in your area.",
    ad: "Tank due for a pump-out?",
  },
  {
    key: "plumbing",
    label: "Plumbing",
    match: ["plumb", "drain", "rooter", "pipe"],
    query: "emergency plumber near me",
    headline: "Leaks fixed fast. Done right.",
    jobs: ["Leaks", "Water heaters", "Drains"],
    review: "Fixed the leak in an hour. Friendly and fair.",
    post: "Cold snap coming. Here’s how to protect your pipes.",
    ad: "Leak that can’t wait?",
  },
  {
    key: "roofing",
    label: "Roofing",
    match: ["roof", "gutter", "siding"],
    query: "roof repair near me",
    headline: "A roof you can stop worrying about.",
    jobs: ["Repairs", "New roofs", "Inspections"],
    review: "Honest quote, and the crew cleaned up after.",
    post: "Storm last night? Here’s what to check first.",
    ad: "Missing shingles after the storm?",
  },
  {
    key: "hvac",
    label: "Heating & air",
    match: ["hvac", "heating", "cooling", "air", "furnace", "mechanical"],
    query: "ac repair near me",
    headline: "Comfortable again by tonight.",
    jobs: ["AC repair", "Heating", "Tune-ups"],
    review: "House was cool again by dinner. Great service.",
    post: "Three signs your AC needs a tune-up.",
    ad: "AC blowing warm air?",
  },
  {
    key: "lawn",
    label: "Lawn care",
    match: ["lawn", "landscap", "tree", "garden", "mowing", "yard"],
    query: "lawn care near me",
    headline: "The best-looking yard on the block.",
    jobs: ["Mowing", "Clean-ups", "Planting"],
    review: "Shows up every week. The yard has never looked better.",
    post: "Before and after: a weekend clean-up.",
    ad: "Yard getting away from you?",
  },
  {
    key: "cleaning",
    label: "Cleaning",
    match: ["clean", "maid", "janitor", "wash"],
    query: "house cleaning near me",
    headline: "Come home to a clean house.",
    jobs: ["Homes", "Offices", "Move-outs"],
    review: "Spotless every time. I’ve stopped checking.",
    post: "Our five-minute kitchen reset.",
    ad: "Need the house guest-ready?",
  },
  {
    key: "electric",
    label: "Electrical",
    match: ["electric", "wiring", "lighting"],
    query: "electrician near me",
    headline: "Safe, tidy electrical work.",
    jobs: ["Repairs", "Panels", "Lighting"],
    review: "On time, explained everything, left it tidy.",
    post: "Flickering lights? Here’s when to call.",
    ad: "Breaker keeps tripping?",
  },
  {
    key: "auto",
    label: "Auto repair",
    match: ["auto", "tire", "mechanic", "collision", "garage", "brake", "towing"],
    query: "auto repair near me",
    headline: "Back on the road. No surprises.",
    jobs: ["Brakes", "Oil & tune-ups", "Diagnostics"],
    review: "Told me what could wait and what couldn’t. Rare.",
    post: "What that dashboard light is telling you.",
    ad: "Check-engine light on?",
  },
  {
    key: "other",
    label: "Something else",
    match: [],
    query: "best local service near me",
    headline: "The local name people trust.",
    jobs: ["What you do", "Where you work", "How to book"],
    review: "Easy to reach, did exactly what they said.",
    post: "A look at this week’s jobs.",
    ad: "Need it done this week?",
  },
];

export const defaultTrade = "septic";

export const story = {
  kicker: "How it works",
  title: "Watch a customer *find you.*",
  prompt: "What kind of business do you run?",
  namePrompt: "Business name (optional)",
  placeholderName: "Your Business",
  steps: [
    {
      tag: "The search",
      title: "Someone nearby needs help.",
      text: "Right now, a few miles from you, a person is typing this into their phone.",
    },
    {
      tag: "Google & local SEO",
      title: "They find you.",
      text: "I set up your Google profile, tune your website and help the reviews come in, so yours is the name they see.",
    },
    {
      tag: "Web design",
      title: "Your site makes it easy.",
      text: "One clear page that loads fast and says what you do. The call button is always under their thumb.",
    },
    {
      tag: "Social media, reviews & ads",
      title: "You look busy and trusted.",
      text: "Fresh posts, answered reviews and a few well-aimed ads. Proof that real people hire you.",
    },
    {
      tag: "The whole point",
      title: "They call you.",
      text: "That’s the job: more of the right people picking up the phone.",
    },
  ],
  cta: "Let’s set this up",
  example: "example",
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
  after: { src: "/images/ali-foodies/compare/after-home.jpg", width: 664, height: 3861, label: "After" },
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
  hint: "Keep scrolling",
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
  steps: [
    { title: "We talk.", text: "A short call. You tell me about the business and what’s not working." },
    { title: "You get a plan.", text: "What I’d build, what it costs and how long it takes. A fixed quote, in writing, before anything starts." },
    { title: "I build. You react.", text: "You see it early and tell me what to change. Nothing technical to learn." },
    { title: "We go live.", text: "Then I stay around to keep it working and keep it fresh." },
  ],
};

export const about = {
  kicker: "Who you’ll work with",
  title: "One person *who answers.*",
  text: [
    "I’m Ubaid. For four years I’ve been building websites and apps that thousands of people use every day.",
    "Now I do the same for local businesses. You deal with me directly: when you email, I reply, and when something breaks, I fix it.",
  ],
  stats: [
    { value: 4, suffix: "", label: "years building for the web" },
    { value: 8, suffix: "", label: "products launched" },
    { value: 20, suffix: "k+", label: "people using what I’ve built" },
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
