# Portfolio handoff

## What is here

The portfolio is a Next.js 16 / React 19 / TypeScript app. The redesign is ready for release to `main`. It uses Tailwind 4, Radix-based shadcn-style primitives, Geist fonts, Motion, and local MDX. All 18 original page URLs remain: home, Work, nine case studies, About, Contact, Playground, Now, Writing and two articles. `/api/og`, sitemap, robots, Person/ProfessionalService structured data and article structured data are included.

The starting checkout was the GitHub profile repository, not the old portfolio source. The existing README, profile assets, data and daily GitHub workflow remain. `npm run profile:build` runs the original automation. The site’s public content, real photos, CV and screenshots were recovered from its live deployment. See `docs/source-inventory.json` and `DECISIONS.md`.

## Run and deploy

Use Node 22 or newer:

```sh
npm ci
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

The owner authorized merging to `main` and deploying on 11 October 2026. The live domain currently uses Vercel. Use the Next.js preset, repository root, and `npm run build`, with `main` as the production branch. A local preview uses port 3000; the QA production preview uses port 3001. ChatGPT and the earlier avatar remain disabled until their separate provider setup is complete.

## Configuration

Copy `.env.example` to `.env.local` for local testing; set production values in Vercel. Never prefix secret keys with `NEXT_PUBLIC_`.

| Variable                      | Purpose / safe default                                                                                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY`              | Server-only Google credential for short-lived Live tokens and text fallback.                                                                                                    |
| `UPSTASH_REDIS_REST_URL`      | Upstash Redis endpoint for shared counters and short-lived chat state.                                                                                                          |
| `UPSTASH_REDIS_REST_TOKEN`    | Server-only Redis credential.                                                                                                                                                   |
| `AVATAR_ENABLED`              | Defaults to `false`. Use `true` only after setting and testing Google + Redis.                                                                                                  |
| `AVATAR_DAILY_SESSION_CAP`    | Global daily session count, default 30. Set to `0` to stop new sessions. Invalid values fail closed. This is a session budget, not an exact dollar budget.                      |
| `DECART_API_KEY`              | Reserved for the requested facial renderer. Not used until the vendor supplies a verified audio-to-avatar protocol.                                                             |
| `NEXT_PUBLIC_CAL_LINK`        | Cal booking path, e.g. your verified `username/event`. No link means the modal offers a direct email instead.                                                                   |
| `NEXT_PUBLIC_SENJA_WIDGET_ID` | Real Senja widget UUID. The entire testimonial section is absent until this is set. Configure its widget styling to monochrome in Senja.                                        |
| `GITHUB_TOKEN`                | Optional read-only token for the full official GitHub contribution graph. Without it, Now shows honestly labeled recent public events, or an unavailable message. Cached daily. |
| `GEMINI_LIVE_MODEL`           | Default `gemini-3.8-live`, verified against current Google docs during the build. Override if account access or the provider’s current model changes.                           |
| `GEMINI_TEXT_MODEL`           | Default `gemini-2.5-flash`.                                                                                                                                                     |

Public environment variables are baked into the build. Rebuild after changing Cal or Senja settings.

## ChatGPT connection: the current public experience

The homepage now opens an **Experience my work** panel with **Continue with ChatGPT**. It is a text conversation using the visitor’s eligible plan allowance, with account-specific model selection and streaming. Booking and email stay available without connecting. Full setup, security, and verification details are in [docs/CHATGPT.md](docs/CHATGPT.md).

Hosted-client approval from OpenAI is required. Set the `CHATGPT_*` variables documented in `.env.example` only after that approval. Until then, the panel honestly shows **Connection opens soon**. The integration uses no owner OpenAI API key and never silently switches to owner-funded Gemini requests. Live OAuth and plan usage have not been tested without the approved client credentials.

## Earlier Gemini/Decart implementation (inactive UI)

Shipped: click-only session creation, a disclosed AI persona, polite/unfiltered tone, voice input/output, captions, microphone controls, typing, bounded server-owned text history, live page tools, portrait/audio feedback, provider-failure fallbacks, End, silence timeout and hard expiry. Google and Redis clients load only on the relevant server path or after interaction. No permanent key reaches the browser.

**Decart facial animation is blocked by the public API, not silently simulated.** The installed official SDK and current model index do not expose `live_avatar` or a PCM-chunk portrait-animation interface. The `/api/avatar/decart-token` route is present and intentionally returns the safe portrait fallback without minting a billable unrestricted token. `lib/avatar/expressions.ts` contains the expression prompts for a future documented adapter. Do not “fix” this with a Lucy camera-restyling model; it is a different service. Ask Decart for the actual Avatar Live model/API access and its current streaming documentation before implementing the renderer.

No live Google, Decart, Redis, Cal or Senja credentials were provided, so those paid/account-specific integrations are not claimed as live-tested. The missing-configuration paths and mocked conversation transport are verified. Before enabling the avatar, check an actual microphone conversation, interruption, text fallback, captions, three-minute expiry and daily limits with your accounts.

## Earlier avatar: costs and abuse limits

- Three sessions per IP per UTC day, plus a global daily session count. Atomic Redis checks cover all instances. Failed provider initialization conservatively consumes its reservation.
- Only Vercel’s overwritten IP header is trusted. Other hosts share one conservative bucket until a trusted-proxy integration is added.
- Gemini tokens are single-use, model/config constrained, expire in 180 seconds, and must be used within 30 seconds. No session-resumption token is issued.
- A browser timer ends the conversation after 20 seconds without activity. The token expiry is the independent provider-enforced ceiling.
- Text fallback allows at most 12 turns per session, 1,200 characters per message and 400 output tokens per answer. Requests cannot supply fabricated assistant history. Redis history expires with the session.
- Missing Redis, invalid budget or disabled avatar fails closed. End clears server text state and closes microphone tracks and audio contexts.
- Conversation audio is sent to Google. No audio is recorded by this app. In-memory transcripts are cleared on unmount; text history lives in Redis only for the short session window. Do not put personal secrets into the knowledge file.
- Keep provider-side spending alerts/quotas enabled. IP budgets limit ordinary abuse, not a distributed attack. Decart remains off and incurs no usage.

## Content and TODOs

- `content/site.ts`: positioning, contact, employment, principles, stack and FAQ.
- `content/projects.ts`: project names, stable slugs, summaries, dates, stack and screenshots.
- `content/work/*.mdx`: case-study prose. Keep existing slugs to preserve inbound links.
- `content/posts.ts` and `content/writing/*.mdx`: article metadata and prose. Historical metrics remain dated.
- `content/now.ts`: current projects, learning notes and the honest `updated` date. Change this when updating the content.
- **Pricing TODO:** fill the `startingAt` numbers in `content/pricing.ts`. Null shows “Scope first, quote second”; no placeholder dollar values are published.
- **Booking TODO:** supply your Cal link in the environment.
- **Testimonial TODO:** supply a real Senja widget ID. No invented reviews exist.
- **Logo TODO:** none. All five real favicons/logos were fetched and normalized locally. `docs/logo-sources.json` records their origins.
- Full contribution-calendar TODO: optional GitHub token. Private GitLab work is not presented as GitHub contributions.
- `public/Ubaidullah-CV.pdf`: recovered original CV.

## Tune the persona

Edit `content/avatar/persona.md` for voice, dry wit and interaction boundaries. Edit `knowledge.md` for verified facts. The latter contains the source-site snapshot; keep it synchronized with case studies. Both are loaded on the server. No website-browsing tool exists, so the avatar explicitly asks for page copy or context instead of pretending it inspected a visitor’s URL.

## QA

`docs/QA.md` records final results and any remaining limitations. Full-resolution screenshots and machine-readable results are in ignored `qa-output/`, so large generated evidence is not committed.

- `scripts/qa/screenshots.mjs`: all 18 routes plus the 404 page at 375, 768, 1280, 1440. Scrolls through the page to load screenshots and settle reveals before capture.
- `scripts/qa/interactions.mjs`: real UI interactions, missing-configuration behavior, reduced motion and all-route accessibility.
- `scripts/qa/chatgpt.mjs`: connection and conversation panels at four widths, keyboard accessibility, missing approval/configuration, and separately labeled mocked authorization, streaming, quota, Stop, expiry and disconnect states.
- `tests/chatgpt-security.test.ts`: identity verification, encryption, grants, configuration boundaries, model catalog filtering, request constraints and stream parsing.
- `tests/avatar-policy.test.ts`: input boundaries, budgets, origin validation and IP-header trust.

Set `QA_BASE_URL` to test another local production port. The screenshot and interaction scripts use installed Google Chrome through Playwright. The build is fully usable without `.env.local`.
