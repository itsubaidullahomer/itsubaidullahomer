# Design

This branch is the client-facing site on itsubaidullahomer.com: one page that sells web design, local SEO,
social media and ads to owners of local businesses. The hiring portfolio that used to be here lives on the
`cv-portfolio` branch and is served from cv.itsubaidullahomer.com; its old addresses redirect there
(`next.config.ts`).

## Who it is for

Business owners and managers, usually on a phone, usually arriving from a link in an email after a call.
They are not technical. Copy says what they get in plain words: no stack names, no jargon, no invented
numbers. Every figure on the page is also on the hiring portfolio.

## Look

- Clean, light, premium. White (`--bg`) with a warm off-white (`--soft`) for the hero panel and alternate
  sections, and one dark panel at the end (`--dark`) for contact and footer.
- One accent: the gold in the portrait (`--gold`, `--gold-deep` for text on white, `--gold-soft` / `--gold-tint`
  for fills). No second accent colour.
- The name on the site is "Ubaid", written "Ubaid." with a gold full stop in the bar and the footer. The full
  name appears only in the structured data.
- Type: Geist for everything; one word or phrase per heading in Instrument Serif italic, in gold. In
  `content/studio.ts` that phrase is written between `*stars*`.
- Hairline borders, soft shadows, large radii. No thick outlines, hard offset shadows, stickers or cartoon
  shapes: the owner rejected that direction outright.
- Direct, not clever. The owner found a pinned "watch a customer find you" phone demo confusing and had it
  removed; say what is offered in plain words and let the motion carry the fun.
- Screenshots are never cropped or blown up. Each is shown at its own shape and at a size its pixels can
  fill; the owner called out soft, cropped captures by name.

## How motion works

`components/fx.tsx` has one scroll listener, one intersection observer and one animation frame for the whole
page. It only writes a progress number to a CSS variable (`--p`); the stylesheets decide what moves. Only
things within half a screen of view are measured. Every default is the finished state, so the page is complete
with no script, and `prefers-reduced-motion` unpins the pinned scene. The site is built phone first: the plain
stylesheet is the phone, and wider screens add to it.

- Hero (`hero.css`): a soft panel with thin rules, a headline that rises line by line (two grey lines, two
  black), the portrait rising under an arch, a gold strip of services running down it, a turning badge and a
  small moving preview of real work. On the way out the lines drift apart sideways and the panel tucks back.
- Who I am (`intro.tsx`): one sentence that lights up word by word as it is read, three promises, three numbers.
- Headings (`.h2--fill`) fill from grey to black as they scroll into view.
- Services: each card arrives as it comes on screen, driven by its own scroll progress: it rises on a phone,
  comes in from its own side in two columns, and is dealt in from the edges in three. At the top of each is a
  small looping screen (`service-art.tsx`, `art.css`): a search page where the business climbs to first, its
  website, a post, an ad, business cards, a status panel. They are meant to be recognisable, not replicas:
  the owner found abstract placeholder shapes lifeless, and did not want a copy of the real Google either.
  Their wording is `sample` in `content/studio.ts`; on a `/for/…` link they carry the visitor's name.
  A scene only plays while its card is on screen and starts from the top each time; off screen it is a still
  picture. Animate transform and opacity only in new scenes (a box-shadow or width loop repaints every frame).
- Before and after: a draggable wipe between two full-page phone captures, with the site's fixed bars pinned.
- Work (`work.tsx`, `work.css`) has two forms. On a desktop with a mouse, the reel: two big words slide apart,
  then screenshots float past sideways at different heights, each bobbing and turning slightly. On phones,
  tablets and touch screens, the deck: the cards come up one at a time, swinging in from alternate sides,
  settle under the bar, and sink back and fade as the next one covers them (the owner found the sideways
  reel odd on a phone). Long pages scroll inside a taller window in both.
- After the work: three bands of very large type, each far wider than the screen, sliding against each other.
- Anything that moves sideways in a loop repeats its content enough to fill a very wide monitor, and the whole
  site scales up smoothly above 1600px wide (`html` font size in `base.css`), so a big monitor zoomed out looks
  like the same page, not a small one; sizes are in rem so they follow, and image `sizes` follow the same line.
- Also: a very large word behind the steps, a giant line of type across the contact panel, and the name
  rising letter by letter in the footer.

## Opening curtain

`components/loader.tsx`, `lib/opening.ts` (runs before anything paints), `styles/loader.css`. On the first
visit of a session the name rises letter by letter while a counter and a gold line follow what has really
loaded: the type, the portrait and the opening's sounds (never more than nine seconds). At 100 the counter
gives way to an **Enter** button (and "Enter without sound"). Enter is the visitor's first click, the only
moment a browser allows sound, so the curtain lifts with the opening playing in time: the press, a whoosh at
the curtain's fastest point, a shimmer as the headline lands, the counter ticking up, a pop as the badge
appears. The hero is held (paused) until then. If nobody presses anything it lifts by itself after nine
seconds, quietly. A reload, an `#anchor` link or reduced motion skips it (`html.seen`); with no script at
all it plays a short timed version. A personal link shows "Prepared for …" on it.

## Sound

`lib/sound.ts`, `components/sound.tsx`, files in `public/sounds/v1` (made with ElevenLabs Sound Effects v3:
four takes each, picked by measurement, trimmed, faded and levelled; the tonal ones are all in C major).
The files start downloading before the page paints and are decoded straight away, so a sound is ready the
moment the browser allows it; each starts at its first audible sample. Sound is on by default with a switch
in the bar, remembered per device; on iPhones it follows the silent switch and mixes with music. Presses
sound the instant the mouse goes down (on touch, when the tap lands). Hover (mouse only, never while
scrolling) is a faint tick; clicks a soft tap; chips and answers a pop, higher on and lower off; section
links a tap and a whoosh, and what they pass on the way stays quiet; service cards play a rising scale at
the moment each one lands (`Track` `sound` props); work cards land with a soft thud; counters tick, rising
with the count; the before and after handle ratchets; copying the email rings a bell; turning sound on
plays a C–E–G–C chime; the contact panel shimmers once. Keep new sounds in the same family and quiet: a
sound that answers a click or a moment, never one that loops. Replace a file by adding `v2/`.

## Personal links

`/for/<business-name>` renders the same page for one business: `/for/smith-septic` shows "Prepared for Smith
Septic" in the hero and fills the name into the contact form (`lib/business.ts`, tested in
`tests/business.test.ts`). These pages are `noindex` and blocked in
`robots.txt`. The name is stripped to letters, numbers and ordinary punctuation and capped at 40 characters.

## Speed

The owner's clients open this on phones, often on poor connections, so first paint comes before everything.

- The stylesheet is inlined into the page (`experimental.inlineCss`): on a slow connection the page paints
  in about 2s instead of 5s. Keep the CSS lean.
- Sections below the work are not laid out until they come near (`content-visibility` in `sections.css`).
  Same-page links and pages opened at an `#anchor` lay out the whole page first (`AnchorFix`).
- Screenshots are imported in `content/studio.ts`, never linked by path: that gives them a blurred preview
  while they load and a fingerprinted address that can be cached for a long time. Give every image a
  `sizes` that matches how wide it is really drawn.
- Only the portrait is preloaded. The serif is only used in italics and is not preloaded.
- `/for/…` pages are built on their first visit and then served from the cache.

## Rules

- All copy lives in `content/studio.ts`. Components only render it.
- The contact form has no server: it writes an email and opens the visitor's own mail app.
- Never state how many tools ToolkitJar has, anywhere.
- Checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
