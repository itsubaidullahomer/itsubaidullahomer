# Verification report

Verified 11 October 2026 against the local production build on `http://127.0.0.1:3001`. Account-specific services were not enabled. These are local lab measurements, not deployed field performance.

## Build and code

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: 8 policy tests passed, including budgets, input bounds, origin validation and trusted IP-header handling.
- `npm run build`: passed; all 18 original page routes generated, with dynamic avatar and OG endpoints.
- `git diff --check`: passed.
- `npm audit --omit=dev`: zero production dependency advisories.
- The full audit reports five related development-only advisories through Next's lint plugin → fast-glob → micromatch → braces. The current braces release remains affected; npm's proposed fix downgrades Next's lint configuration to version 14. Keep the matching version-16 tooling and revisit the upstream fix. These packages are not shipped in the production dependency set.

## Mobile Lighthouse

Default Lighthouse mobile simulation using installed Google Chrome, with no competing browser audit:

| Category       | Score |
| -------------- | ----: |
| Performance    |    91 |
| Accessibility  |   100 |
| Best practices |   100 |
| SEO            |   100 |

FCP: 0.9 s. LCP: 3.5 s. Total blocking time: 10 ms. Cumulative layout shift: 0. Scores can vary with hardware, cache, network and third-party embeds. Retest after enabling Cal, Senja or the live avatar.

The first audit scored 89 performance / 92 accessibility. Corrections included valid Radix tab ID references, stronger label contrast, simpler mobile hero layers, image loading priorities, and accessible copy-button icons. The final audit meets all requested thresholds.

Evidence: `qa-output/lighthouse-final.report.html` and `.json`.

## Responsive visual passes

- First complete page pass: 18 routes × 4 widths = 72 screenshots in `qa-output/phase-pages/`.
- Final complete pass: the same 18 routes plus the 404 page × 4 widths = 76 screenshots in `qa-output/polish-final/`.
- Widths: 375, 768, 1280 and 1440 pixels. Screenshots include the full page after scrolling through deferred images and one-time reveals.
- Both reports contain zero horizontal-overflow or uncaught-runtime issues.
- Additional homepage and polish captures supported the visual corrections. Review sheets cover every final route at each width, with a separate homepage section review.

The final review checked typography and wrapping, mobile navigation, hero composition, project imagery, section spacing, the services bento, long-form reading widths, and footer alignment. The Aceternity reference informed rails, spacing, typography, card structure and motion; its assets and page composition were not copied.

## Interaction and accessibility checks

`scripts/qa/interactions.mjs` passed 15 checks:

- No avatar session request on initial page load.
- Booking dialog opens, supplies its missing-config email fallback, and closes with Escape.
- Product tabs switch the actual screenshot.
- The before/after slider works from the keyboard.
- FAQ expands and collapses.
- Copy email writes the correct clipboard value.
- Missing avatar credentials produce the booking fallback.
- Screenshot zoom opens and closes with Escape.
- Streaming-lab failure and retry preserve output.
- The call simulator supports interruption.
- The Tututor architecture tool changes workflow and traces the request.
- Mobile navigation closes after a selection.
- Reduced motion disables continuous animation.
- Mocked typed transport exercises tone, transcript, reply and End cleanup.
- A mocked server expiry ends the client session.

Axe scanned all 18 content routes at mobile width: zero violations. The interaction run recorded zero uncaught runtime errors. A separate production smoke scan found zero browser console errors and zero broken loaded images across all 18 routes. Each route has exactly one H1, its correct canonical URL and parseable JSON-LD. `/api/og`, `/sitemap.xml`, `/robots.txt` and the original CV download all returned HTTP 200 with the expected content types.

Evidence: `qa-output/interactions.json`, `qa-output/seo-smoke.json` and the per-pass `report.json` files.

## Limits of this verification

- Google Live, regular Gemini responses and distributed Redis counters need an owner-account integration test. Browser transport mocks do not prove vendor interoperability or billable behavior.
- Decart does not expose the requested `live_avatar` / audio-driven portrait interface in the checked public SDK and documentation. Facial animation remains blocked; the safe portrait renderer is explicit. See `docs/API-SOURCES.md` and `HANDOFF.md`.
- Cal and Senja require the owner's actual link/widget ID. Their missing-config behavior is tested; authenticated widgets are not.
- A full GitHub contribution graph needs the optional read-only token. The public-events fallback is labeled accurately and cached daily.
- The site has not been pushed or deployed. Recheck canonical URLs, provider quotas, origin checks and audio behavior on the final HTTPS domain before enabling paid sessions.

Large screenshots and reports are intentionally ignored by Git. Reproduce them with the documented scripts in `HANDOFF.md`.
