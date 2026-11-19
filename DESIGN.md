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

- Clean, light, premium. White (`--bg`) with a warm off-white (`--soft`) for alternate sections and one dark
  panel at the end (`--dark`) for contact and footer.
- One accent: the gold in the portrait (`--gold`, `--gold-deep` for text on white, `--gold-soft` / `--gold-tint`
  for fills). No second accent colour.
- Type: Geist for everything; one word or phrase per heading in Instrument Serif italic, in gold. In
  `content/studio.ts` that phrase is written between `*stars*`.
- Hairline borders, soft shadows, large radii. No thick outlines, hard offset shadows, stickers or cartoon
  shapes: the owner rejected that direction outright.
- The fun comes from motion, not decoration: things slide in from the left and right, a phone plays out a
  story while pinned, the work travels sideways.

## How motion works

`components/fx.tsx` has one scroll listener and one animation frame for the whole page. It only writes a
progress number to a CSS variable (`--p`); the stylesheets decide what moves. Every default is the finished
state, so the page is complete with no script, and `prefers-reduced-motion` unpins the two pinned scenes.

- Hero (`hero.css`): words rise in, "searching" types into a search bar, the portrait sits on a fan of two
  real screenshots that spreads as the page scrolls.
- Story (`story.tsx`, `story.css`): a pinned phone in five beats (search, found, website, proof, call). The
  beat boundaries are `STEP_AT` in the component and the matching `clamp()`s at the top of the stylesheet;
  change them together.
- Services: each card is dealt in from the side, driven by its own scroll progress.
- Before and after: a draggable wipe between two full-page phone captures.
- Work (`work.tsx`, `work.css`): a row of cards that moves sideways while the page scrolls down.

## Personal links

`/for/<business-name>` renders the same page for one business: `/for/smith-septic` shows "Prepared for Smith
Septic", puts the name in the demo phone and the contact form, and picks the trade from words in the name
(`lib/business.ts`, tested in `tests/business.test.ts`). These pages are `noindex` and blocked in
`robots.txt`. The name is stripped to letters, numbers and ordinary punctuation and capped at 40 characters.

## Rules

- All copy lives in `content/studio.ts`. Components only render it.
- The contact form has no server: it writes an email and opens the visitor's own mail app.
- Never state how many tools ToolkitJar has, anywhere.
- Checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
