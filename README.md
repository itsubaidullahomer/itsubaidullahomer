# Shipped

The creative portfolio of Ubaidullah Omer, a web developer. The whole site is one idea: a shipping label on a cardboard box. It is meant for `creative.itsubaidullahomer.com`; the full case studies stay on [itsubaidullahomer.com](https://itsubaidullahomer.com).

- The hero is a shipping label. Its weight, delivery time and dimensions are measured by the visitor's own browser (the Performance API), the tracking number is the commit that was deployed, the barcode is real Code 128 and the QR code really starts an email.
- The label is the front of a cardboard box built from CSS planes. Scrolling pulls the camera back until the box shows, cuts the tape, lifts the four projects out and finally drops into the empty box, whose floor becomes the next section. No 3D or animation library.
- Projects are parcels with delivery slips, the career is a tracking history, the promises are handling marks, contact is a pickup request.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
```

Next.js 16 (App Router), React 19, TypeScript, plain CSS. No UI library, no animation library, no backend.

## Edit it

| To change | Edit |
| --- | --- |
| Any text, project, job, FAQ or link | `content/site.ts` |
| Colours, type, buttons, stamps, tape | `app/globals.css` |
| The hero label | `components/Label.tsx`, `app/styles/label.css` |
| The opening shot and the 3D box | `components/Voyage.tsx`, `app/styles/voyage.css` |
| Project slips and the archive | `components/Parcels.tsx`, `app/styles/parcels.css` |
| Tracking, handling, services, FAQ, contact, footer | `components/Sections.tsx`, `app/styles/sections.css` |
| Screenshots | `public/work/` (`scripts/prep-images.mjs` crops them from the main portfolio) |

Rules the content follows: every number is one that is true today, and ToolkitJar's tool count is never stated because it keeps growing.

## Deploy

Import the repository in Vercel (framework: Next.js, no environment variables needed) and add the domain `creative.itsubaidullahomer.com`. Until a custom domain is attached, the site tells search engines not to index it.
