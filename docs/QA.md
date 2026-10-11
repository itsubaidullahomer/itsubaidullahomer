# Verification report

Verified 11 October 2026 against the local production build on `http://127.0.0.1:3001`. Account-specific services were not enabled. These are local lab measurements, not deployed field performance.

## Build and code

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: 17 tests passed: 8 avatar-policy tests and 9 ChatGPT tests covering token validation, encryption, grants, configuration, input bounds, model filtering and stream parsing.
- `npm run build`: passed; all 18 original page routes generated, with dynamic ChatGPT, avatar and OG endpoints.
- `git diff --check`: passed.
- `npm audit --omit=dev`: zero production dependency advisories.
- The full audit reports five related development-only advisories through Next's lint plugin → fast-glob → micromatch → braces. The current braces release remains affected; npm's proposed fix downgrades Next's lint configuration to version 14. Keep the matching version-16 tooling and revisit the upstream fix. These packages are not shipped in the production dependency set.

## Mobile Lighthouse

Default Lighthouse mobile simulation using installed Google Chrome, with no competing browser audit:

| Category       | Score |
| -------------- | ----: |
| Performance    |    92 |
| Accessibility  |   100 |
| Best practices |   100 |
| SEO            |   100 |

FCP: 0.9 s. LCP: 3.4 s. Total blocking time: 0 ms. Cumulative layout shift: 0. Scores can vary with hardware, cache, network and third-party embeds. Retest after enabling Cal, Senja or live provider access. The lazy-loaded ChatGPT dialog sends no account or inference request on initial page load.

The first audit scored 89 performance / 92 accessibility. Corrections included valid Radix tab ID references, stronger label contrast, simpler mobile hero layers, image loading priorities, and accessible copy-button icons. The final audit meets all requested thresholds.

Evidence: `qa-output/lighthouse-chatgpt.report.html` and `.json` for the current homepage; `lighthouse-final` preserves the earlier portfolio audit.

## Responsive visual passes

- First complete page pass: 18 routes × 4 widths = 72 screenshots in `qa-output/phase-pages/`.
- Final complete pass: the same 18 routes plus the 404 page × 4 widths = 76 screenshots in `qa-output/polish-final/`.
- Widths: 375, 768, 1280 and 1440 pixels. Screenshots include the full page after scrolling through deferred images and one-time reveals.
- Both reports contain zero horizontal-overflow or uncaught-runtime issues.
- Additional homepage and polish captures supported the visual corrections. Review sheets cover every final route at each width, with a separate homepage section review.

The final review checked typography and wrapping, mobile navigation, hero composition, project imagery, section spacing, the services bento, long-form reading widths, and footer alignment. The Aceternity reference informed rails, spacing, typography, card structure and motion; its assets and page composition were not copied.

## Interaction and accessibility checks

`scripts/qa/interactions.mjs` passed 13 checks after the ChatGPT change:

- No avatar session request on initial page load.
- Booking dialog opens, supplies its missing-config email fallback, and closes with Escape.
- Product tabs switch the actual screenshot.
- The before/after slider works from the keyboard.
- FAQ expands and collapses.
- Copy email writes the correct clipboard value.
- Missing hosted ChatGPT credentials produce the disabled connection panel, with booking and email still available.
- Screenshot zoom opens and closes with Escape.
- Streaming-lab failure and retry preserve output.
- The call simulator supports interruption.
- The Tututor architecture tool changes workflow and traces the request.
- Mobile navigation closes after a selection.
- Reduced motion disables continuous animation.

Axe scanned all 18 content routes at mobile width: zero violations. The interaction run recorded zero uncaught runtime errors. A separate production smoke scan found zero browser console errors and zero broken loaded images across all 18 routes. Each route has exactly one H1, its correct canonical URL and parseable JSON-LD. `/api/og`, `/sitemap.xml`, `/robots.txt` and the original CV download all returned HTTP 200 with the expected content types.

Evidence: `qa-output/interactions.json`, `qa-output/seo-smoke.json` and the per-pass `report.json` files.

## ChatGPT conversation

`scripts/qa/chatgpt.mjs` passed 16 checks with zero uncaught runtime errors. It covers the real unconfigured endpoints and separate browser-only transport fixtures: explicit sign-in, callback handling, first-use acknowledgement, model selection, tone, streaming, late quota errors, incomplete replies, Stop, expiry during an active reply, disconnect, Escape/focus restoration, and access to human booking. Stop and expiry additionally exercise a real local HTTP stream to verify cancellation. None of these fixtures authenticates with OpenAI or consumes plan usage.

The connection and connected-chat panels were captured and scanned at 375, 768, 1280 and 1440 pixels: eight views, zero accessibility violations and zero horizontal overflow. Evidence is in `qa-output/chatgpt/`. The connected screenshots use clearly named demo account/model fixtures; they are not evidence of a live account connection. Keyboard focus on the scrollable transcript was corrected during accessibility testing. Expiry cancels the active reply without letting its asynchronous error replace the reconnect guidance. Stop and Send use separate buttons so stopping cannot accidentally resubmit the restored draft.

OpenAI hosted-client approval, compatible plan-usage grants, Redis credentials and the registered OAuth client are still required. Real OAuth, actual model discovery and plan-funded inference remain unverified. Setup and the required live checks are documented in `docs/CHATGPT.md`.

## Limits of this verification

- ChatGPT hosted-client approval and a real eligible account are required to verify provider interoperability and plan usage. Browser transport mocks do not prove either.
- The earlier, now inactive Google Live / Gemini implementation and distributed Redis counters also lack an owner-account integration test.
- Decart does not expose the requested `live_avatar` / audio-driven portrait interface in the checked public SDK and documentation. Facial animation remains blocked; the safe portrait renderer is explicit. See `docs/API-SOURCES.md` and `HANDOFF.md`.
- Cal and Senja require the owner's actual link/widget ID. Their missing-config behavior is tested; authenticated widgets are not.
- A full GitHub contribution graph needs the optional read-only token. The public-events fallback is labeled accurately and cached daily.
- The site has not been pushed or deployed. Recheck canonical URLs, registered redirects, permissions, provider quotas and origin checks on the final HTTPS domain before enabling the connection.

Large screenshots and reports are intentionally ignored by Git. Reproduce them with the documented scripts in `HANDOFF.md`.

## Tututor gallery — 11 October 2026

The featured project and case study now share a gallery with six areas and 23 screenshots. Asset existence and intrinsic dimensions were checked for all 23 images. The additional editor close-up was captured from the signed-in demo account; the other views come from the owner's original portfolio assets.

Browser checks covered the home, work and Tututor case-study routes; all six area selections; thumbnail changes; vertical keyboard tab navigation; the mobile horizontal tab list; screenshot enlargement; next-image navigation; original-size scrolling; and Escape dismissal. Desktop original-size mode served the 1600-pixel source directly and produced a scrollable inspection region. Native concepts remain labeled as design exploration.

At requested widths 375, 768, 1280 and 1440, document scroll width matched client width, and all three displayed phone images loaded. Review captures are in `qa-output/release/tututor-gallery-{width}.jpg`. Mobile inspection was reviewed separately. The active area is mounted on demand, and thumbnails use small responsive image sizes.

`npm run lint`, the production build (including TypeScript and all static routes), and the existing 17 unit tests passed. The gallery interactions above were checked through browser controls; the legacy whole-site browser script was not rerun for this change.

## Illume and Viloi product cards — 11 October 2026

Both cards now have three selectable product views, scope figures, contribution notes, and screenshot inspection. The same galleries replace the tall cover captures on both case-study pages. New assets include Illume's public dashboard/revenue artwork, two captures of Viloi's public website, and the original portfolio's two archived website images. Dimensions were verified for all six assets; public previews and older designs are labeled.

Browser checks covered the homepage, work page and both case studies; tab switching and arrow-key navigation; both inspection dialogs; previous/next controls; original-size scrolling; and Escape dismissal. Illume's original archive image loaded at 2561 pixels and produced a 2597-pixel scroll area. The viewer was also reviewed at phone width. Only the active screenshot panel mounts.

At requested widths 375, 768, 1280 and 1440, document client/scroll widths matched at 360, 753, 1265 and 1425 respectively. Captures are in `qa-output/release/illume-viloi-{width}.jpg`. The final visual pass aligned scope labels, kept each full screenshot within a stable frame, and checked the case-study image sizing. No browser console errors were recorded in the checked routes.

`npm run lint` and the production build (TypeScript and all 32 routes) passed. No new unit tests were added for this presentation change; interactions were verified in the browser. The authenticated Viloi editor was not accessed, and the public demonstration's example scores were not validated as product-performance claims.

### Viloi demo-account follow-up

After the owner signed in and authorized continuation, the built-in 58-word sample was processed once, producing a 56-word output. Two 853 × 731 captures now show the actual editor and its open tone selector. The public writing demonstration was removed from the gallery; the public plans capture and archived design remain. The Controls preview focuses on the top of the screenshot, while inspection preserves the full source image.

Verified Writing → Controls → Subscriptions → Origins navigation, four-view numbering, screenshot next navigation and Escape dismissal. The new four-tab strip scrolls within the card at 375 pixels without overflowing the document (360-pixel client and scroll widths); desktop was reviewed at 1440 pixels. The existing gallery appears in both the work card and Viloi case study. This capture verifies one completed demo interaction, not the accuracy of the product's detection score. Lint and production build passed.

### Viloi preview crop

Writing and Controls now use a top-aligned 2.4:1 crop. The work-card preview was visually checked for complete sample paragraphs and the open tone menu; its image fills the available 483-pixel width. The inspection dialog still serves the original 853 × 731 image. Lint and the production build passed. The crop is shared by home/work cards and the case-study gallery; source assets are unchanged.

### Compact project overview cards

At 1440 pixels, default Tututor/Illume/Viloi card heights changed from roughly 1097/1134/1134 to 545/509/485 pixels. Ali Foodies now measures 586 pixels (previously 700), with its entire phone visible. At 853 pixels, the first three cards measure 552/494/470 pixels. All six Tututor areas and all seven Illume/Viloi views were exercised; the largest desktop Tututor view measured 595 pixels. Three complete mobile app screens remain visible in the phone gallery. Original-size inspection served the 2559 × 1279 Viloi archive at its intrinsic width, and dismissal worked.

At 375 pixels, tabs remain horizontally scrollable within the card and document client/scroll widths both measured 360 pixels. Phone cards retain normal vertical flow so all content stays readable; they are not forced to viewport height. The 853-pixel work page retains its pre-existing five-pixel decorative overflow, with no card content beyond the viewport. Ali Foodies' presets and keyboard adjustment were checked (After → ArrowRight → Split: 0 → 5 → 50). Lint and production build passed. No new unit tests were added for this CSS layout change.
