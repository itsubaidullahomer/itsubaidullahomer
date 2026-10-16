# Opportunity pipeline — portfolio theme review

## Final direction

The admin is a private Next.js/React web app for one candidate. Its main task is moving opportunities from discovery to a recorded outcome, with reviewable evidence and explicit application decisions. It opens directly on Kanban.

The user asked the admin to follow the existing portfolio. The design therefore takes its visual language from `app/globals.css`, `app/page.tsx`, and the `Wordmark` in `components/shell.tsx`: white canvas, near-black type, fine neutral rules, Geist, mono utility labels, the ubaid/✳ mark, and black pill-shaped primary buttons. This overrides the earlier system-dark and blue-gray direction. The admin deliberately stays light, like the portfolio, including when the device prefers dark appearance.

## Review findings and resulting changes

- **Critical — legibility:** The initial board's 9px company label (`#7b8f9b` on white, 3.36:1) missed the 4.5:1 text contrast target. Cards now use 16px role titles, 13px company/next-step text, and 12px metadata; secondary text is `#525252`. [Accessibility › Vision](https://developer.apple.com/design/human-interface-guidelines/accessibility): “Strive to meet color contrast minimum standards.” [Typography › Ensuring legibility](https://developer.apple.com/design/human-interface-guidelines/typography) informed readable sizes and regular-to-semibold weights.
- **High — the board must dominate:** An early browser review found the columns started too far down the screen. The pipeline now has one title/action row, compact counts with stage navigation, then two regular-width search/filter rows. Its decorative eyebrow and tagline are removed. [Layout › Visual hierarchy](https://developer.apple.com/design/human-interface-guidelines/layout): “Order content by relative importance.”
- **High — visual continuity:** The user found the gray theme too flat. The revised light palette, black selected navigation, clear column headers, stronger panel borders, black company initials and subtle card shadows make the admin a recognizable part of the portfolio. This is a product-specific design judgment; Apple does not prescribe this palette.
- **High — accessible movement:** Every card has a native Move to select alongside drag/drop. [Drag and drop › Best practices](https://developer.apple.com/design/human-interface-guidelines/drag-and-drop): “Offer alternative ways to accomplish drag-and-drop actions.” Approved and Applied remain protected destinations requiring explicit review or manual application recording.
- **Medium — compact navigation:** All six navigation sections remain available at narrow widths. Stage jump and arrow controls reach every column, including Drafting, Closed and Archived. [Layout › Adaptability](https://developer.apple.com/design/human-interface-guidelines/layout) informed preserving functionality across widths.

## Applied tokens

Ratios use WCAG sRGB relative luminance. Canvas and separator tokens are structural and carry no text.

| Role                        | Value                  | Contrast                             |
| --------------------------- | ---------------------- | ------------------------------------ |
| Canvas/card                 | `#ffffff`              | —                                    |
| Primary text/accent         | `#171717`              | 17.93:1 on white                     |
| Secondary text              | `#525252`              | 7.81:1 on white; 7.49:1 on `#fafafa` |
| Primary button              | White on `#202020`     | 16.29:1                              |
| Structural rule / card edge | `#e5e5e5` / `#d4d4d4`  | —                                    |
| Strong-fit signal           | `#236143` on `#edf6ef` | 6.65:1                               |

Geist Sans carries content and controls. Geist Mono carries small structural labels and counts, matching the portfolio. Headers and cards use crisp 8px corners; black primary actions use the portfolio's pill shape. Column headers are white, column bodies are `#fafafa`, and white cards have visible neutral edges with restrained shadows. A faint vertical grid supports the workspace without competing with content. Color is reserved for fit and other meaningful state signals; no generic blue accent remains.

## Responsive structure

Regular width: one navigation rail and a compact header above spacious horizontal columns. Compact width: readable cards with part of the next column visible, wrapped controls, stage navigation, and six labeled bottom navigation items.

```text
Regular
┌──────────┬───────────────────────────────────────────────┐
│ ubaid ✳  │ Opportunity pipeline             [Find roles] │
│ Pipeline │ Active · Strong · Review       Jump to…  ‹ › │
│ Overview │ Search…                 Add · Export · View  │
│ Review   │ Fit · Stage · Priority · Eligibility         │
│ Activity │ Discovered 2 │ Shortlisted 1 │ Drafting 0 │ →│
│ Profile  │ Company      │ Company       │ Empty state   │
│ Settings │ Role / fit   │ Role / fit    │               │
│          │ NEXT STEP    │ NEXT STEP     │               │
│          │ Due · Move to│ Due · Move to │               │
└──────────┴───────────────────────────────────────────────┘
Compact
┌───────────────────────────────┐
│ Pipeline                      │
│ Opportunity pipeline  [Find] │
│ Counts · Jump to stage   ‹ ›  │
│ Search · Add · View · Filters │
│ Discovered          │ Short…│
│ Company / role      │       │
│ Fit · NEXT STEP     │       │
│ Due · Move to…      │       │
│ Six labeled navigation items │
└───────────────────────────────┘
```

The signature is the next-step block on each card, within the portfolio's familiar white-and-black framework. It belongs to this candidate's evidence-first job search. There is no animated entrance; brief hover/drop feedback respects reduced motion. Content surfaces are opaque; reduced transparency removes the dialog backdrop blur. Increased contrast strengthens panel outlines. Native controls, visible focus, and Radix dialog dismissal preserve keyboard paths without custom global shortcuts.

The same palette and button treatment cover Overview, Approvals, Activity, Profile, Connections, setup/login styling, and detail/application drawers. Authentication behavior, stored data, and backend actions are unchanged.

## Validation and limits

TypeScript and portal ESLint pass after the theme implementation. Domain behavior was unchanged by this visual pass. Browser QA confirmed the theme at 1280px and approximately 921px, and both drag/drop and the Move to control succeeded. The browser did not honor the requested 390px viewport override, so mobile visual verification remains pending. No keyboard-only, physical-device or VoiceOver test is claimed by this theme pass.

## Skill scope and references

The user explicitly requested the [Apple Design skill](https://github.com/dickwu/apple-design-skill/blob/main/SKILL.md), read at `/private/tmp/jobs-apple-design-skill/SKILL.md`. Its accessibility, typography, color and layout principles inform this web app; native macOS menu bars, SwiftUI materials and iOS-only conventions are not imposed. The user's portfolio theme takes precedence over the skill's default appearance suggestions.

Local references read: `accessibility.md`, `layout.md`, `typography.md`, `color.md`, `designing-for-macos.md`, `sidebars.md`, `toolbars.md`, `collections.md`, `drag-and-drop.md`, `keyboards.md`, and `cross-platform.md`.

[Sidebars › Best practices](https://developer.apple.com/design/human-interface-guidelines/sidebars), [Toolbars › Best practices](https://developer.apple.com/design/human-interface-guidelines/toolbars), and [Keyboards › Best practices](https://developer.apple.com/design/human-interface-guidelines/keyboards) informed flat navigation, grouped actions, and native focus behavior. The [Collections](https://developer.apple.com/design/human-interface-guidelines/collections) guidance favors tables for dense text; Kanban is the user's requested workflow visualization and List remains available.
