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

`components/fx.tsx` has one scroll listener and one animation frame for the whole page. It only writes a
progress number to a CSS variable (`--p`); the stylesheets decide what moves. Every default is the finished
state, so the page is complete with no script, and `prefers-reduced-motion` unpins the pinned scene.

- Hero (`hero.css`): a soft panel with thin rules, a headline that rises line by line (two grey lines, two
  black), the portrait rising under an arch, a gold strip of services running down it, a turning badge and a
  small moving preview of real work. On the way out the lines drift apart sideways and the panel tucks back.
- Who I am (`intro.tsx`): one sentence that lights up word by word as it is read, three promises, three numbers.
- Headings (`.h2--fill`) fill from grey to black as they scroll into view.
- Services: each card is dealt in from the side, driven by its own scroll progress.
- Before and after: a draggable wipe between two full-page phone captures, with the site's fixed bars pinned.
- Work (`work.tsx`, `work.css`): two big words slide apart, then screenshots float past sideways at different
  heights, each bobbing and turning slightly. Long pages scroll inside a taller window.
- Also: a very large word behind the steps, a giant line of type across the contact panel, and the name
  rising letter by letter in the footer.

## Personal links

`/for/<business-name>` renders the same page for one business: `/for/smith-septic` shows "Prepared for Smith
Septic" in the hero and fills the name into the contact form (`lib/business.ts`, tested in
`tests/business.test.ts`). These pages are `noindex` and blocked in
`robots.txt`. The name is stripped to letters, numbers and ordinary punctuation and capped at 40 characters.

## Rules

- All copy lives in `content/studio.ts`. Components only render it.
- The contact form has no server: it writes an email and opens the visitor's own mail app.
- Never state how many tools ToolkitJar has, anywhere.
- Checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
