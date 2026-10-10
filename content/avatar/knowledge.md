# Verified knowledge — captured from the owner’s portfolio on 10 October 2026

Ubaidullah Omer (Ubaid), AI Product Engineer, Rahim Yar Khan, Pakistan (UTC+5). Self-taught, four years of web apps. Available for select freelance product and AI work; also considers product and AI engineering roles. No rates or guaranteed start dates are published. Contact: itsubaidullahomer@gmail.com. Use the page booking action to schedule.

Canonical project slugs: tututor, insight-x (Illume), ai-humanizer (Viloi), ali-foodies, jurri, yaksport, crown-kabab, animated-landing, toolkitjar.

## tututor


All work
Live
Nov 2023 – Present
Lead engineer, from first rebuild to today
Tututor.ai
An AI tool for teachers that I rebuilt three times and grew into a school platform: eight products, one backend, 20k+ users.
Visit Tututor.ai
Tututor.AI
AI tools
AI editor
Images
Mind maps
Virtual tutors
Assistant
Plans
EduNova
Dashboard
Messages
Timetable
Apps
Mobile apps
app.tutor.ai
Tututor.AI
40+ AI tools for lesson prep
Didactic units, exams, mind maps, games, rubrics. Grouped by what the teacher wants to do, with a search box that understands plain requests.
01
/
11
0
1
20k+
Students, teachers & families
schools across Murcia, Spain
0
2
~6,000
Commits across 9 repos
3,600+ of them mine
0
3
~1,000
API endpoints
on ~90 data models, one Express backend
0
4
6
Store listings
3 apps, each on iOS and Android
The product family
One login,
8
products.
What schools see as “Tututor” is a set of separate apps, each with its own repo and release cycle, sharing one backend and one data model. I built that backend and most of what sits on it. The junior developers I led, and later the founder himself, committed alongside me.
Backend
·
Every app
Core API
The Express backend all eight products talk to. Auth with 2FA and Google/Apple sign-in, school scoping, realtime chat, push, file storage, billing and the AI layer.
2,164 commits · ~1,000 endpoints · ~90 models
Node.js
Express
MongoDB
Socket.io + Redis
Web app
·
Teachers
Tututor.AI
The original product. 40+ AI tools for lesson prep (didactic units, rubrics, quizzes, mind maps, games) and a document editor with AI actions built in.
1,552 commits · 138k lines · since Oct 2024
React
Redux / RTK Query
Plate + TipTap
Stripe
Web app
·
Teachers
EduNova for teachers
Where a teacher runs their day: grades (including infant-school report cards), attendance, homework with AI feedback, messages, meetings, curriculum planning.
1,290 commits · 30 API services, 604 hooks
React 19
RTK Query
Socket.io
jsPDF
Web app
·
School office
EduNova school admin
Enrolment, teacher assignments, and the finance module: receipts, SEPA direct-debit batches, tax forms. Also the Educamos import and Plumier XXI export.
353 commits · 36 API services, 665 hooks
React
RTK Query
SEPA XML
XLSX
Web app
·
Our team
Platform admin
The internal console: schools, users, curriculum master data by region, bulk imports, and product analytics.
76 commits · 165 endpoints wired
React 19
Vite
Tailwind 4
Recharts
Mobile app
·
Parents
Familias
Homework, attendance, grades, permission slips, messages and the school timetable, for every child in the family, with push notifications.
182 commits · v1.39 Android · v1.24 iOS
React Native 0.77
FCM / APNs
Google + Apple sign-in
Mobile app
·
Students
Alumnos
The student's day: homework, grades, timetable, online tests, files and the class board.
82 commits · v1.10 Android · v1.5 iOS
React Native 0.77
FCM
2FA
Mobile app
·
Teachers
Profesores
Take the register from the classroom, set homework, grade, message families, and correct exams with AI. The largest of the apps.
74 commits · 99k lines · v1.5 Android
React Native 0.84
TypeScript
R8
The journey
Three rebuilds and a lot of commits.
It didn't start as a platform. It started as someone else's Next.js app with a problem to fix. Each chapter below is a real point in the git history, with what the product looked like at the time.
Before Oct 2024
What I was handed
A Next.js app and a bug to fix.
The founder came to me with this app and one problem. Looking at the code, I told him the honest version: fixing this bug would take a day, and the next ten would too. I said we should rebuild it instead, and he agreed. My brother designed the new version.
The app as it came to me.
My brother's redesign, the plan for rebuild one.
2024
Rebuilds 1 & 2
React and Redux, on Firebase.
I rewrote it as a React app with Redux, then rebuilt the data layer on Firebase for auth and storage, because I didn't know backend work yet. By 12 October 2024 it was 229 files and 37,000 lines. It worked, but the AI calls to OpenAI, Anthropic and Gemini ran in the browser, API keys included. That was the thing I most needed to fix.
React 18
Vite
Redux Toolkit
Firebase
The React rebuild, with my brother's design.
Oct 2024
Rebuild 3
I learned backend work, then wrote ours.
By then I'd built a few backends on other projects and I was ready. I told the founder we needed our own, and built it: Express and MongoDB, first code on 16 October 2024. Three days later the frontend's auth moved off Firebase, and within a month every AI tool generated through the server. The keys left the browser, credits and Stripe billing got a proper home, and we finally had somewhere to put data we owned.
Node.js
Express
MongoDB
JWT
Stripe
Nov 2024 – Mar 2025
Growth
Forty tools and a real editor.
The busiest stretch: 870 commits to the frontend in three months. The catalog grew to 40+ tools built on the curriculum data for each Spanish region, plus games, a quiz generator, mind maps and Google Classroom export. The first editor showed generated text in a read-only box with three buttons. I replaced it with a full document editor where you select a paragraph and ask the AI to improve, expand, shorten or turn it into a table.
Plate
TipTap
OpenAI
Claude
Gemini
Replicate
Mar – Dec 2025
The turn
From a tool teachers use to a platform schools run on.
Schools liked the tools and asked for everything else. I added a school model to the backend in March 2025, then attendance, students, grades and messaging over the next months, and started the teacher platform and the admin panel on top. The work outgrew one person, so I led a small team of junior developers: three app developers and a couple of web developers. I set the architecture and split the work between them, and kept most of the backend myself. The parent app followed in September 2025.
Socket.io
FCM push
2FA
Redis
2026
Depth
The unglamorous things schools actually need.
Infant-school report cards graded by observation, not numbers. A finance module that builds SEPA direct-debit files by hand, so schools can collect fees from families' banks. Importing a school's whole roster from Educamos, and exporting grades to Plumier XXI, the regional system, in its exact format: golden-tested against real exports, 1,833 out of 1,833 matched. Then the scaling work: queries scoped by school, a Redis adapter so sockets work across instances, locks so scheduled jobs run once, file storage moved from Cloudinary to Cloudflare R2, and indexes and aggregations where the queries got slow.
SEPA pain.008
Educamos
Plumier XXI
Cloudflare R2
Mid 2026
Team of two
Down to two people, and both of us can do everything.
By the middle of 2026 the juniors had moved on. By then the founder had grown into a real developer, and he now builds features the juniors used to. Since then it has been the two of us, and either of us can pick up anything from the database to the App Store release.
Sep 2026
Now
Three apps in both stores, and a native rewrite.
I shipped Familias, Alumnos and Profesores to the App Store and Google Play: moved them to newer React Native, fixed the Android 16 KB page-size requirement, turned on R8 obfuscation, added Google and Apple sign-in, and worked through store rejections. Then I started the next rebuild: a Kotlin Multiplatform core with SwiftUI and Jetpack Compose on top. 226 commits in its first five days.
React Native
Kotlin Multiplatform
SwiftUI
Jetpack Compose
Home concepts for the native Familias app. The owl, Nova, won.
Then and now
The editor, then and now.
The first version showed you the generated text and let you copy it. Today it's a full document editor. Select any passage and the AI rewrites it in place, and every image and document from the generation sits one click away.
first version
First version: read, then copy, save or download.
today
Today: a full editor, with AI actions on whatever you select.
On the phone
Three apps, both stores.
Parents, students and teachers each get their own app, all on the same backend as the web platform. These are the store screenshots, taken from our demo school.
Profesores
Home: next class, one tap to take the register
Alumnos
Home
Familias
Homework
Profesores
Timetable
Alumnos
Grades
Familias
Attendance
Profesores
Homework
Familias
Messages
Architecture
How the system is wired.
Eight products, one backend. Hover a box to see what it does, or play a scenario to watch a request travel through it.
4 web apps
React · RTK Query
3 mobile apps
React Native
Express API
~1,000 endpoints
Realtime
Socket.io + Redis
AI layer
Prompts · model routing
Scheduled jobs
node-cron + locks
MongoDB
~90 models
Cloudflare R2
Files
LLMs
OpenAI · Claude
Push
FCM · APNs
School systems
Educamos · SEPA
Trace a request
Pick a scenario to watch a request travel through, or hover a service to see what it does.
A teacher generates a didactic unit
A teacher takes the register
The school collects monthly fees
Client
Service
AI
Data
External
The part I'm proudest of
I taught my client to code. Now he ships features.
When we started, the founder couldn't read code. He'd send me lists of wording changes: this button should be in Spanish, this label is wrong. So I showed him how to do it himself. Find the string, change it, commit, push. His first commit in the backend changed three lines. His first in the frontend translated three strings.
Then it kept going. He copied an existing tool to make a new one. He learned to edit prompts, then to add fields, then whole screens. Two years later he builds complete features across the backend, web and mobile apps: dining, absenteeism tracking, family invoices, tax forms. He works the way I do now, with an AI assistant and conventional commits. In July 2026 he made more backend commits than I did. The juniors I led have moved on, and today the founder and I run the whole product between us.
At some level, that's a threat to my job. I'm fine with that, and I'd do it again. A client who understands his own product makes better decisions, gives better feedback and trusts the work, because he's seen how it's made. I think teaching the people you build for is part of the job, and it's the fair thing to do.
Nov 2024
First commits: three strings translated to Spanish, and a three-line change to which AI models the tools use.
Nov 2024
First new tool, built by copying an existing one: 7 files, 1,184 lines.
Feb 2025
Adds new AI tools on the backend himself.
Feb 2026
First full feature across backend and web: the school dining system.
May 2026
Builds billing receipts and returned-payment handling for SEPA direct debits.
Mid 2026
The junior team moves on. From here it's the two of us, and he takes on the work they used to do.
Sep 2026
Ships an absenteeism system of about 10,000 lines. His median commit has grown from 16 lines to 487.
What I owned
01
Rebuilt the product three times: frontend to React, then off Firebase onto a backend I wrote, then the platform around it.
02
Designed and wrote most of the Express backend: auth, school scoping, realtime messaging, push, storage, billing and the AI layer. About 1,000 endpoints on 90 models.
03
Built the finance module (SEPA direct-debit batches, receipts, surcharges), the Educamos import and the Plumier XXI grades export.
04
Did the scaling work: Redis socket adapter, cron locks, the R2 storage migration, index and aggregation rewrites, an authentication floor across the API.
05
Shipped three React Native apps to both stores, and started the native Kotlin Multiplatform + SwiftUI rewrite.
06
Led a team of junior developers through 2025 and early 2026 (three app developers and a couple of web developers): set the architecture and split the work. Taught the founder to code; today it is the two of us.
Stack
React
Redux Toolkit / RTK Query
Node.js
Express
MongoDB
Socket.io + Redis
React Native
Kotlin Multiplatform
SwiftUI
OpenAI
Claude
Gemini
Stripe
Cloudflare R2
Firebase Cloud Messaging
Next
Insight-X · now Illume

## insight-x


All work
Live
Dec 2024 – Jun 2025
Full-Stack Engineer (part-time)
Insight-X · now Illume
Business analytics for MedSpas that builds its own dashboards from whatever data you connect. Live today as Illume Analytics.
Visit Insight-X · now Illume
joinillume.com
The live site, captured full page. Scroll inside the frame.
0
1
$250k
Funding secured
platform demoed traction
0
2
3
Booking platforms integrated
Boulevard, Zenoti, Vagaro
0
3
0
Manual chart config
AI generates the logic
0
4
4
Dashboard surfaces
revenue, bookings, providers, retention
The problem
MedSpa operators wanted dashboards for revenue, bookings, provider performance and retention, without paying an analyst to rewrite queries every time their schema changed. The BI tools they tried assumed they could write SQL or spend an afternoon in a chart builder. Neither was true.
The approach
I built an engine that inspects the incoming data structure and generates the chart logic for it at runtime. Dashboards re-render against whatever the connected platform returns, whether that's Boulevard, Zenoti or Vagaro, with no manual configuration in between. The frontend is React with Chart.js and D3, where every chart is a real component instead of an embedded iframe.
The outcome
The platform showed enough traction to help the company close $250k in funding. Operators got live dashboards for revenue, bookings, provider performance and client retention in one place without writing a query. The company has since rebranded to Illume Analytics and is still serving wellness practices today.
What I owned
01
Built the analytics engine that generates chart logic from the raw data structure.
02
Designed and implemented real-time dashboards for revenue tracking, booking analytics, provider performance, and retention.
03
Integrated MedSpa platforms (Boulevard, Zenoti, Vagaro) for automatic operational data ingestion.
04
Owned the frontend architecture: chart composition, state and responsive layouts.
Stack
React
Tailwind CSS
Chart.js
D3.js
OpenAI API
Node.js
Express
MongoDB
Previous
Tututor.ai
Next
Viloi

## ai-humanizer


All work
Live
Side project
Full-Stack Engineer
Viloi
A writing tool at viloi.com that rewrites machine-generated text so it reads naturally. Multi-model pipeline, Stripe billing, built solo.
Visit Viloi
viloi.com
The live site, captured full page. Scroll inside the frame.
0
1
3
LLM providers
GPT-4, Claude, Gemini with fallback routing
0
2
0
Manual billing
Stripe + webhook-driven subscriptions
0
3
JWT
Stateless auth
no server-side session storage
The problem
Tools built on a single model fail unpredictably. One model's output gets flagged, another one's doesn't, and there's no good way to know in advance which will work for a given piece of text. Most of them also have no real billing, so they never get past the prototype stage.
The approach
The pipeline routes text through GPT-4, Claude and Gemini with fallback logic between them, so if one model's output comes back flagged the next one takes a different angle at it. Stripe handles subscriptions and plan changes through webhooks, and JWT keeps sessions stateless. I gave the UI its own look mostly so it wouldn't blend into the wall of identical AI tools.
The outcome
It's live with paying customers and billing that runs itself. The fallback design means the product keeps working when one provider changes behavior, which happens more often than you'd expect.
What I owned
01
Built the multi-model pipeline with fallback, so a flagged result gets retried through a different model.
02
Implemented Stripe subscription billing with webhook automation for plan changes, cancellations, and dunning.
03
Designed and implemented JWT-based authentication so the API stays stateless.
04
Designed and built the UI so the product didn't look like every other AI tool.
Stack
React
Node.js
Express
MongoDB
OpenAI
Anthropic
Gemini
Stripe
JWT
Previous
Insight-X · now Illume
Next
Ali Foodies

## ali-foodies


All work
Building
2026 – present
Redesign and rebuild
Ali Foodies
Rebuilding Ali Foodies' website for the phone, because that's where almost every customer finds it.
The old site
The new build
01
Before
alifoodies.com
9:41
02
After
alifoodiess.vercel.app
9:41
Scroll
0%
Before
After
The old site and the new one, scrolled together on the same phone.
The brief
Ali Foodies already had a website. Around 99.9% of the people who use it are on a phone, so the new version is built for that screen first and everything else second. Rather than list every change, the comparison above puts the previous site and the new build on the same phone and scrolls them together. The new version is live as a preview while I finish it.
Previous
Viloi
Next
Jurri

## jurri


All work
Live
Sep 2023 – Apr 2024
Frontend Engineer
Jurri
Cloud storage, a unified inbox and a password vault in one app for enterprise teams.
Visit Jurri
jurri.danzeetech.com
The live site.
0
1
~30%
Code duplication removed
via reusable component + hook library
0
2
~40%
Faster initial load
code splitting + lazy loading + bundle work
0
3
3-in-1
Product surface
files, inbox, vault, one app
The problem
Teams were using four separate tools for what was really one workflow: storage, email across several accounts, shared credentials and access control. None of them talked to each other, so people spent half their day moving between tabs.
The approach
One product with three surfaces (files, inbox, vault) sharing the same navigation, search and auth model. RTK Query handled server state with fairly aggressive cache invalidation so nothing on screen went stale. I split the frontend into small components and hooks the rest of the team could reuse, and over a few months that turned into the library everyone built new screens from.
The outcome
Reusing those components noticeably cut the time it took the team to put up a new screen. Code splitting and lazy loading brought the initial load down by about 40%. And users stopped juggling tabs, which was the point.
What I owned
01
Built the reusable React component and hooks library the team ended up using for everything.
02
Built drag-and-drop file uploads with multi-file progress and resumable behavior.
03
Implemented the unified inbox aggregating multiple email accounts behind one UI.
04
Worked on the bundle with code splitting and lazy loading for roughly a 40% faster first load.
Stack
React
Redux Toolkit
RTK Query
Node.js
Express
MongoDB
Previous
Ali Foodies
Next
Yaksport

## yaksport


All work
Live
Jan 2023 – Aug 2023
Frontend Engineer
Yaksport
Booking platform for Danish sports clubs looking for training camps abroad. Over 100 clubs use it.
Visit Yaksport
yaksport.dk
The live site, captured full page. Scroll inside the frame.
0
1
100+
Sports clubs served
0
2
2
Languages
Danish + English via i18next
0
3
0
Page reloads on filter
every search is in-place
The problem
Clubs comparing camps care about facilities, location, season and price all at once. The old site couldn't answer those questions, so every enquiry turned into a phone call to the agency.
The approach
Search comes first and re-queries on every interaction without the page flashing. Content runs through i18next so the same components render in Danish or English. React Router keeps the funnel state intact when someone goes back a step, which they do constantly.
The outcome
Over 100 clubs are on the platform. Most bookings now go through without anyone at the agency being involved, so they only handle the unusual requests instead of every single quote.
What I owned
01
Built the multi-filter search surface and the booking funnel.
02
Wired i18next for Danish/English content with locale-aware routing.
03
Integrated REST APIs for camp data and availability.
Stack
React
Tailwind CSS
i18next
React Router
REST APIs
Previous
Jurri
Next
Crown Kabab

## crown-kabab


All work
Shipped
Nov 2022 – May 2023
Full-Stack Engineer
Crown Kabab
Ordering site for a restaurant, with Stripe checkout, Google sign-in and Danish/English support.
crown-kabab
The live site.
0
1
100%
Owned ordering surface
no aggregator fees on direct orders
0
2
2
Languages
Danish + English
The problem
The restaurant was handing 30% of every order to delivery apps. They wanted their own ordering page, and one that didn't look like a form from 2014.
The approach
Redux Toolkit for cart and order state, RTK Query for server state, Stripe for payments, Google OAuth so nobody has to make an account, and i18next for the two languages. Order tracking connects the kitchen view to the customer view, so a status change only has to be made once.
The outcome
The restaurant now takes its regulars' orders directly instead of paying an aggregator for them.
What I owned
01
Built shopping cart, payment processing, and order tracking using Redux Toolkit + RTK Query + Stripe API.
02
Wired Google OAuth for one-tap sign-in.
03
Implemented i18next for Danish/English with locale-aware copy.
Stack
React
Redux Toolkit
RTK Query
Stripe
Google OAuth
i18next
Previous
Yaksport
Next
Animated Landing

## animated-landing


All work
Shipped
Side project
Frontend Engineer
Animated Landing
A landing page built to find out how much motion I could add before the Lighthouse score dropped.
animated-landing
The live site.
0
1
95+
Lighthouse score
performance band with full motion intact
0
2
60fps
Scroll & parallax
GPU-only transforms
0
3
0
Layout thrash
no measure→mutate in the hot path
The problem
Most animated marketing pages either run at 30fps and feel like syrup, or get stripped back to nothing so they look good on PageSpeed. There is a middle ground, but it takes enough fiddling that most teams give up after the first regression.
The approach
I treated every animation as a budget question. GPU-composited transforms only, and nothing that forces layout mid-scroll. Framer Motion handles orchestration and GSAP the timeline-heavy parts. The scroll work goes through requestAnimationFrame so it can't block the main thread, and only the critical CSS loads up front.
The outcome
A page with reveals, parallax depth and glass panels that still lands in the green Lighthouse bands.
What I owned
01
Built the motion layer, combining Framer Motion for orchestration with GSAP for timelines.
02
Implemented scroll-triggered effects, parallax interactions, and glassmorphism design at 60fps.
03
Tuned the page to 95+ on Lighthouse without cutting any of the motion.
Stack
React
Tailwind CSS
Framer Motion
GSAP
Previous
Crown Kabab
Next
ToolkitJar

## toolkitjar


All work
Live
Side project
Developer
ToolkitJar
A free online tools website I built, with tools for text, SEO, code and images, including a text compare tool, a word counter and a JSON formatter. Everything runs in the browser, so nothing is uploaded.
Visit ToolkitJar
toolkitjar.com
The live site.
The problem
Small everyday jobs, like counting words, comparing two pieces of text or formatting JSON, shouldn't need an account or an upload.
The approach
Every tool runs in the browser, so nothing you paste or drop in leaves your machine. The tools are grouped by the job they do, and a search that opens with Ctrl K gets you to the right one quickly.
The outcome
Live at toolkitjar.com and still growing. I add new tools regularly.
Previous
Animated Landing

## Employment and practice


About
Engineer who thinks like a
product person.
I'm
Ubaidullah Omer
, a product engineer based in
Rahim Yar Khan, Pakistan
. Four years of building web apps, mostly at startups that didn't have a designer, a PM and an engineer for every feature. Usually it was just me.
That changed how I work. I sketch the data model before I draw the screen, and I try to work out what happens when the AI call fails before I write the prompt. It's less elegant than it sounds. Mostly it means fewer rewrites later.
Right now I'm at
Tututor.ai
. It came to me as someone else's Next.js app with one bug to fix. I rebuilt it three times, wrote the backend, and grew it into eight products: an AI toolkit for teachers, a school platform, and parent, student and teacher apps in both stores. More than 20,000 students, teachers and families in Murcia, Spain use it.
Along the way I led a small team of junior developers, and taught the founder to code. He started by changing a few words of Spanish. Now he ships whole features, and the two of us run the product between us.
Before that I spent two years at
Danzee Tech
in Denmark. I joined as a junior and left as the person the team handed new features to. Alongside that I've done a few contract and side projects, including
Insight-X
, an analytics platform that helped the company raise $250k and runs today as Illume Analytics.
My stack is React, Node, Express and MongoDB, plus whichever LLM API the product needs. I have opinions about streaming and prompt caching, and I think most teams spend too little time on what their product does when the model fails.
Rahim Yar Khan, Pakistan
4+ years experience
Available for select work
View my CV
Start a conversation
Fig. 01
Hover for colour
4+
Years building production software
20k+
People using what I build at Tututor.ai
9
Products shipped to production
$250k
Raised with help from my analytics work
Toolbox
What I build with,
and why.
Not a complete list. These are the ones I reach for without thinking about it, grouped by the job they do.
AI / LLMs
Where most of my time goes now. Streaming, fallback chains, prompt pipelines, and everything that has to happen when a call fails.
OpenAI API
Anthropic Claude
Google Gemini
ElevenLabs
Prompt engineering
Streaming responses
Function calling
Frontend
Interfaces that stay fast once the product gets complicated.
React
Next.js
TypeScript
Redux Toolkit
RTK Query
Tailwind CSS
React Native
Framer Motion
Chart.js
D3.js
Backend
APIs shaped around what the product actually needs.
Node.js
Express.js
NestJS
REST APIs
WebSockets
JWT
Microservices
Server Actions
Data
Usually modeled before the first screen gets drawn.
MongoDB
Mongoose
Postgres
Redis
DevOps & Tools
Enough infrastructure to ship and keep things running.
Git
GitHub
GitLab
CI/CD
Vercel
DigitalOcean
Heroku
Cloudinary
Product
The parts that never show up in a stack list but decide whether the product works.
0→1 architecture
UX-led engineering
CRM systems
Stripe payments
Performance optimization
Data visualization

Danzee Tech: React Developer, January 2022–January 2024, Viby, Denmark, remote. Tututor.ai / EduNova: Lead Engineer, November 2023–present, Murcia, Spain, remote. Services offered: AI features, full-stack web apps, mobile apps, landing pages with motion, voice/calling agents, rescue/rebuilds. Availability, scope, timezone overlap, timelines, support and payments must be agreed with the human. No fixed price or response-time commitment is known.
