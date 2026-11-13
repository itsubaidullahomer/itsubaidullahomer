# Portfolio design system

## Reference audit — 10 October 2026
Aceternity was inspected in the browser at desktop and 375px, including its process cards and page structure. Borrow the narrow type, quiet gray secondary copy, bounded page, fine dividers, generously padded white cards, and small working product surfaces. Its current blue brand, mountain artwork, numbered process, and centered hero are deliberately not part of this design.

## Tokens
- White canvas; alternate surfaces #fafafa; text #171717, #525252, #737373. Decorative muted marks may use #a3a3a3. Borders #e5e5e5 and inner rules #f5f5f5.
- Geist Sans for prose; Geist Mono for labels and small metadata. Hero 60px desktop / 42px phone, -0.045em tracking, weight 500. Section headings 36–42px / 30px.
- Frame 1200px with vertical 1px rails. Content inset 56px desktop / 22px phone. Section padding 96px / 64px. Crosshair markers at boundaries.
- Cards radius 20px; nested windows 12px. Layered diffuse neutral shadows. Pills 44px minimum interaction height.
- Monochrome screenshots and portraits. Tiny green/amber status dots only. Avatar is the only dark section surface.

## Components
Nav contracts when scrolling, mobile uses a keyboard-accessible disclosure. Shared buttons, Radix dialog, accordion and tab patterns. Section headers pair concise titles with purposeful descriptions. Product cards have a cursor spotlight, real screenshots, source links and case-study links. Large Tututor showcase, two supporting cards, wide Ali Foodies comparison. Asymmetric services use miniature interfaces, never generic icon grids.

## Motion
Motion springs: stiffness 240, damping 30. Word reveal 55ms stagger, 8px blur and movement. Scroll reveals once; product parallax <=20px; no parallax on mobile or reduced motion. Marquee pauses on hover/focus and has a pause control. Reduced-motion disables blur, transforms and continuous animations. All content stays readable without JavaScript.

## Home page (November 2026)
The home page speaks to people who are hiring. It keeps the tokens above (white canvas, Geist, neutral greys, the slate `#697993` for the one soft phrase, the framed page with corner marks) and adds scroll-driven motion. Freelance content (services, process, pricing, FAQ) lives on `/freelance`.

- **Copy is data.** `content/home.ts` holds the hero, stats, the five build steps, the timeline, the toolbox and the "short version" card. Numbers there must also appear on a case study or the About page.
- **One scroll engine.** `components/home/track.tsx` turns scroll position into a CSS variable (`--p`) on an element; the stylesheet (`app/home.css`, every class prefixed `hx-`) decides what moves. Defaults are the finished state, so the page is complete without JavaScript and under reduced motion.
- **Sections, in order:** hero (dot field, word reveal, real portrait, one row of four numbers) → logo strip → the build scene (pinned, five steps: one Tututor screen goes from wireframe to live while one pointer changes job) → project cards that stack → a band of large words → a short bio that lights up as it is read → the timeline → principles and toolbox → writing → the hiring close with the CV and the short version.
- **Rules for new motion:** it must be tied to scroll or to the pointer, never to a timer that hides content; it must leave the content readable when switched off; no third animation library (the `motion` package stays for the older components).

## Forbidden
Dark theme, a second accent colour, serif/italic emphasis, gradient text, heading emojis, fake status bars, decorative clocks, more than one stat row per page, magnetic buttons, confetti, neon, excessive glass. Avoid generic marketing claims, fabricated metrics, fake testimonials, and invented pricing.
