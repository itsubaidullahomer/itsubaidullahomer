# Decisions

- This checkout is the GitHub profile repository, not the Next.js portfolio described in the brief. Build the requested portfolio in this checkout, preserving README, assets, data and the daily profile workflow. Its command moves to `npm run profile:build`; the existing workflow calls the script directly and is unaffected.
- The live portfolio is the content source of truth. On 10 October 2026 its sitemap exposed nine case studies and two articles; preserve every URL, including `/work/insight-x` (Illume) and `/work/ai-humanizer` (Viloi). Keep Writing because real posts exist on the live source even though this checkout lacked them.
- Use the live site's current 20k+ audience, not the profile's older 17k figure. Preserve historical figures inside dated articles.
- Keep Now: current projects and actual public contribution data add context. Never generate fake contributions when GitHub is unavailable. Retain the source content's update date rather than imply newly verified activity.
- Pricing remains null with explicit TODOs in content; visitors see “Scope first, quote second” until the owner supplies prices. No invented commercial commitments.
- Missing credentials are not a reason to leave a broken interaction: the avatar opens an honest booking/email fallback; paid providers fail closed without distributed rate limiting.
- No frontend-design or browser skill is installed. Use the available browser automation, official API docs, TypeScript and responsive screenshot review as equivalents.
