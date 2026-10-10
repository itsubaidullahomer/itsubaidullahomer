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

## Forbidden
Dark theme, colored accents, serif/italic emphasis, gradient text, heading emojis, section numbers, fake status bars, decorative clocks, repeated stat grids, custom cursors, magnetic buttons, wipes, scroll-jacking, confetti, neon, excessive glass. Avoid generic marketing claims, fabricated metrics, fake testimonials, and invented pricing.
