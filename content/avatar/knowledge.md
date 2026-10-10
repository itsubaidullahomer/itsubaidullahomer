# Verified knowledge — captured from the owner’s portfolio on 10 October 2026

Ubaidullah Omer (Ubaid), AI Product Engineer, Rahim Yar Khan, Pakistan (UTC+5). Self-taught, four years of web apps. Available for select freelance product and AI work; also considers product and AI engineering roles. No rates or guaranteed start dates are published. Contact: itsubaidullahomer@gmail.com. Use the page booking action to schedule.

Project narratives refreshed on 11 October 2026 from the portfolio case studies. First-person project descriptions below refer to Ubaid. Historical project figures remain snapshots.

Canonical project slugs: tututor, insight-x (Illume), ai-humanizer (Viloi), ali-foodies, jurri, yaksport, crown-kabab, animated-landing, toolkitjar.

## tututor

Tututor.ai
Live · Nov 2023 – Present
Role: Lead engineer, from first rebuild to today

I helped an AI teaching tool grow into a school platform by bringing eight products onto one shared backend and AI into teachers’ everyday work. Now used by 20k+ students, teachers and families.

### Know when a fix needs a bigger decision

I joined Tututor to fix one bug in an existing teaching app. Looking at the code, I could see that fixing the next ten bugs the same way would not make it a dependable product. I proposed a rebuild, the founder agreed, and my brother designed the new version.

That first decision set the direction for the work that followed: understand what the product needs next, then give it a foundation that can support it. Over time, a small AI tool became eight connected products used by 20k+ students, teachers and families.

### Build the foundation as the product grows

I initially rebuilt the frontend in React and used Firebase for authentication and storage. It let me move the product forward with the skills I had then. As I gained backend experience, I could address the next limitation: AI calls and permanent API keys were still in the browser.

I built an Express and MongoDB backend and moved authentication, AI generation, credits and Stripe billing onto it. The keys left the browser, and shared product rules had a place to live on the server.

When schools started asking for attendance, grades, messaging and administration, I extended that backend with school-scoped data. The teacher tools, school administration and family apps could share a data model while each kept an interface suited to its users.

### Put AI where teachers can use it

The early experience generated text into a read-only box and asked the teacher to copy it elsewhere. I replaced that with a full document editor: select a passage, then ask AI to improve, expand, shorten or turn it into a table.

That changed the role of AI in the product. A teacher could keep working on the actual document, using AI for a particular part of it. The toolkit also grew to 40+ tools, using curriculum data for Spanish regions, with quizzes, mind maps, games and Google Classroom export.

The product decision was to bring generation and editing into the same workflow, so the output could become something a teacher was ready to use.

### Fit the systems schools already depend on

School software has to work with existing routines and requirements. I built infant-school report cards based on observation, a finance module for receipts and SEPA direct-debit batches, and integrations for importing rosters from Educamos and exporting grades to Plumier XXI.

For the grades export, an approximately correct file was not useful. I checked the output against real exports: all 1,833 golden-test cases matched. The point of that work was to make the connection dependable for the school using it.

As usage grew, I also worked on the parts people should not have to notice: database indexes and aggregations for slow queries, a Redis adapter for messaging across server instances, locks to keep scheduled jobs from running twice, and a move to Cloudflare R2 for file storage.

### Help the team and founder own the product

The work eventually outgrew one person. I led a small team of junior developers, set the architecture and divided the work while keeping most of the backend myself.

I also started teaching the founder to make changes. His first commits were small translations and configuration edits. Over time, he moved into prompts, fields, screens and complete features across the backend, web and mobile apps.

The junior team later moved on, and today the founder and I maintain the product together. Helping him understand the code made the work easier to discuss and gave him more control over his own product. I see that as part of the value I bring to a long-running project.

### Carry the work through to release

I shipped the Familias, Alumnos and Profesores apps to both the App Store and Google Play. That included React Native upgrades, platform requirements, Google and Apple sign-in, and working through store rejections.

The next rebuild uses a Kotlin Multiplatform core with SwiftUI and Jetpack Compose interfaces. It continues the same work across web and mobile: keeping the shared product connected while giving each group an experience that fits its day.

### What the work added

Tututor now brings lesson preparation, classroom work, school administration and family communication onto one platform. The published project snapshot includes eight products, about 1,000 API endpoints across 90 data models, and three mobile apps on both stores.

My role has covered architecture, most of the backend, web and mobile development, releases and team leadership. The value is in how those decisions work together: teachers can edit what AI produces, schools can connect their existing systems, and the founder can keep building the product alongside me.

### The product family in detail

These figures are the snapshot published in the original case study, not live counters.

- **Core API:** 2,164 commits, about 1,000 endpoints and 90 models. Node.js, Express, MongoDB, Socket.io and Redis. Shared authentication includes 2FA and Google/Apple sign-in.
- **Tututor.AI:** 1,552 commits and 138k lines since October 2024. React, Redux / RTK Query, Plate, TipTap and Stripe. The document editor lets teachers improve, expand, shorten or turn a selected passage into a table.
- **EduNova for teachers:** 1,290 commits, 30 API services and 604 hooks. React 19, RTK Query, Socket.io and jsPDF. Grades, infant-school report cards, attendance, homework with AI feedback, meetings and curriculum planning.
- **EduNova school admin:** 353 commits, 36 API services and 665 hooks. React, RTK Query, SEPA XML and XLSX. Enrolment, assignments, receipts, direct-debit batches and tax forms.
- **Platform admin:** 76 commits and 165 wired endpoints. React 19, Vite, Tailwind 4 and Recharts. Schools, users, regional curriculum data, imports and analytics.
- **Familias:** 182 commits; Android v1.39 and iOS v1.24. React Native 0.77, FCM / APNs, Google and Apple sign-in. Homework, attendance, grades, permission slips and messages for every child in the family.
- **Alumnos:** 82 commits; Android v1.10 and iOS v1.5. React Native 0.77, FCM and 2FA. Homework, grades, timetable, online tests, files and the class board.
- **Profesores:** 74 commits and 99k lines; Android v1.5. React Native 0.84, TypeScript and R8. Classroom attendance, homework, grading, family messages and AI exam correction.

The frontend reached 229 files and 37,000 lines by 12 October 2024. The Express backend began on 16 October; authentication moved off Firebase three days later, and AI generation moved server-side within a month. The busiest frontend period added 870 commits in three months. School data entered the backend in March 2025, and the parent app followed in September 2025.

The September 2026 native rewrite started with a Kotlin Multiplatform core and SwiftUI / Jetpack Compose interfaces, with 226 commits in its first five days. The Nova owl concept was selected for Familias. These are historical project figures, not claims about the current repository.

## insight-x

Illume
Live · Dec 2024 – Jun 2025
Role: Full-Stack Engineer (part-time)

I built adaptive dashboards that turn MedSpa booking data into useful business insights, so operators can understand revenue, bookings and retention without writing queries or configuring charts.

### Start with the questions operators ask

MedSpa operators needed to understand revenue, bookings, provider performance and client retention. Their data lived in different booking platforms, and getting a useful dashboard could mean writing queries or configuring charts. I focused on making that information usable without asking operators to become analysts.

### The decisions behind the dashboards

**Adapt to the data coming in.** I built an engine that inspects the incoming data structure and generates chart logic at runtime. That let the dashboards work with data from Boulevard, Zenoti and Vagaro without a separate manual chart setup for each connection.

**Organize around business questions.** Revenue, bookings, provider performance and retention became the main dashboard views. The structure follows what an operator needs to understand about the practice.

**Make charts part of the product.** I built the visualizations as React components with Chart.js and D3. Owning the chart composition, state and responsive layouts gave me control over how the dashboards behaved as a complete interface.

### My contribution

As a part-time full-stack engineer, I built the analytics engine and platform integrations, designed and implemented the dashboards, and owned the frontend architecture. My work connected the data ingestion to the experience people actually used to read it.

### What that made possible

Operators could see their key business information in one place without writing a query. The product is live today as Illume Analytics, and the company went on to raise $250k.

## ai-humanizer

Viloi
Live · Side project
Role: Full-Stack Engineer

I built Viloi from the writing experience through to subscription billing, using model fallbacks to handle varied AI output and automated billing to support a product with paying customers.

### Turn a writing tool into a working product

Viloi rewrites machine-generated text so it reads more naturally. Building it meant thinking beyond the prompt: how to respond when a model gives an unsuitable result, how people access a paid plan, and how subscriptions keep working after the first payment.

### The decisions behind the product

**Give the pipeline another way to try.** I connected GPT-4, Claude and Gemini with fallback routing. When an output is flagged, the pipeline can retry through another model. That gives the product another path when one model's response is unsuitable.

**Build for the whole subscription lifecycle.** I used Stripe webhooks to handle plan changes, cancellations and failed-payment follow-up. Those events need to work just as reliably as checkout if people are going to pay for the product over time.

**Carry the work through the interface.** I designed and built the UI alongside the API, authentication and billing. It gave Viloi a visual identity of its own and let me take responsibility for the complete product.

### My contribution

I built Viloi solo, from the interface and multi-model pipeline to JWT authentication and subscription handling. The engineering decisions covered both the writing feature and the ongoing work of running a paid service.

### What that made possible

Viloi is live with paying customers. Model fallbacks provide a way to retry unsuitable results, and automated subscription handling keeps routine billing changes from becoming manual work.

## ali-foodies


All work
Building
2026 – present
Product design, UX & development
Ali Foodies
A small website rebuild that brings product design, UX, and development together through thoughtful decisions about the customer experience.
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
Why this project is here
Ali Foodies is a small, straightforward website rebuild. Ubaid included it to show the care he brings to product decisions on smaller projects. His work covers product design, UX, and development: understanding what customers need, designing a clearer experience, and building the details to support it.
The decisions
Almost every customer visits on a phone. The redesign puts ordering on the opening screen, makes the menu easier to explore with categories, photos, prices and clear actions, and keeps hours, location, directions and contact options close. The comparison shows the actual previous site and the new build, with a draggable divider and synchronized scrolling. The new version remains a preview while work continues; it is not a completed launch.
Previous
Viloi
Next
Jurri

## jurri

Jurri
Live · Sep 2023 – Apr 2024
Role: Frontend Engineer

I brought files, email and a password vault into a consistent frontend, with shared components that made new screens easier for the team to build and familiar for people to use.

### Make several workflows feel like one product

Jurri brings cloud storage, a unified inbox and a password vault into one app for enterprise teams. My frontend work focused on making those different surfaces feel connected, so people could move between them using familiar navigation and interactions.

### The decisions behind the frontend

**Share the patterns people learn.** I built reusable React components and hooks across the files, inbox and vault screens. The same library gave the team a consistent starting point for new screens and reduced repeated implementation work.

**Keep the interface in step with the data.** I used RTK Query and cache invalidation to refresh server state after changes. In a product with several connected surfaces, what someone sees needs to reflect the work they have just done.

**Make file handling visible.** Drag-and-drop uploads included progress for multiple files and resumable behavior. Uploading a batch needs feedback people can follow, especially when it takes time.

**Load what the current screen needs.** Code splitting and lazy loading reduced the amount of the product required up front. The bundle work brought the initial load down by about 40% during the project.

### My contribution

As a frontend engineer, I built the shared component and hooks library, file upload experience and unified inbox, and worked on loading performance. My contribution was the interface and its connection to the underlying services.

### What that made possible

Teams could work with files, email and credentials in one interface. The development team could reuse established patterns when adding screens, while a lighter initial load made the app quicker to open.

## yaksport

Yaksport
Live · Jan 2023 – Aug 2023
Role: Frontend Engineer

I built the search and booking experience around how sports clubs compare camps, keeping their choices intact as they explore options. The platform serves over 100 clubs in Danish and English.

### Design around a comparison, not a single search

A sports club choosing a training camp has to weigh facilities, location, season and price together. The old site left too many of those questions for the agency to answer. My frontend work focused on helping clubs explore the options and carry their choices through to booking.

### The decisions behind the journey

**Put comparison first.** I built multi-filter search connected to camp and availability data. Results update in place as filters change, so clubs can narrow their options without a full page reload.

**Let people go back without starting again.** I preserved the booking flow's state when someone returned to an earlier step. Revisiting a choice is a normal part of planning a group trip; the interface should support it.

**Keep both languages on the same path.** Danish and English use the same components, with localized content and routing. That kept the search and booking behavior consistent across the two versions.

### My contribution

As a frontend engineer, I built the search interface and booking flow, integrated the camp and availability APIs, and implemented Danish and English support.

### What that made possible

The platform serves over 100 clubs. They can compare camps and move through a standard booking themselves, leaving the agency to help with requests that need a conversation.

## crown-kabab

Crown Kabab
Shipped · Nov 2022 – May 2023
Role: Full-Stack Engineer

I built a direct ordering experience that connects the customer’s cart, payment and order status, giving the restaurant its own sales channel and customers a clear path from choosing food to tracking it.

### Give the restaurant a direct ordering channel

Crown Kabab wanted to take orders through its own website and reduce its dependence on delivery platforms. The product needed to carry a customer from choosing food to payment and order updates, while keeping the kitchen connected to the same order.

### The decisions behind the ordering flow

**Treat the order as one connected journey.** I connected the cart, payment and order tracking, keeping cart state separate from server data. That made each part of the interface reflect the appropriate stage of the order.

**Keep account setup light.** Google sign-in let customers use an existing account, and Stripe handled payment processing. The aim was to make ordering straightforward without adding another password to remember.

**Support the people already ordering.** Danish and English content use the same ordering flow. Customers can follow the process in either language.

**Connect customer and kitchen updates.** A status change in the kitchen is reflected in the customer's order view. Staff only need to make the update once.

### My contribution

I built the cart, payment integration and order tracking, and added Google sign-in and language support. The work tied the customer experience to the restaurant's handling of the order.

### What that made possible

The restaurant gained its own channel for customers to order directly. Those orders no longer needed to pass through a delivery marketplace, giving the restaurant more control over that part of its business.

## animated-landing

Animated Landing
Shipped · Side project
Role: Frontend Engineer

I explored how motion could give a landing page character while keeping it responsive, choosing animation techniques around a performance budget and checking their cost as I built.

### Give motion a performance budget

This was a side project to explore how much character I could bring to a landing page while keeping loading and scrolling responsive. I wanted reveals, parallax and depth to feel like part of the interface, with their performance cost considered from the start.

### The decisions behind the motion

**Choose effects that avoid extra layout work.** I used composited transforms for movement and avoided effects that force layout changes during scrolling. That choice shaped the visuals before I started tuning them.

**Give each animation tool a clear job.** Framer Motion handled orchestration, while GSAP handled the more involved timelines. Scroll updates used requestAnimationFrame to coordinate work with browser frames.

**Check the cost as part of the build.** I prioritized critical CSS and tuned loading alongside the animation work. Performance was a constraint on the design throughout the project.

### What the experiment showed

The original build reached a 95+ Lighthouse score while keeping its reveals, parallax and glass panels. That is the result recorded during the project, rather than a live benchmark for this portfolio.

The value of the exercise was learning to make visual choices with a rendering cost in mind, then checking whether the result still felt fast to use.

## toolkitjar

ToolkitJar
Live · Side project
Role: Developer

I made everyday text, code and image tasks quick to find and private to use, with free tools grouped by purpose and processing kept in the browser so content doesn’t need to be uploaded.

### Make small tasks easy to finish

ToolkitJar grew from everyday jobs: comparing two pieces of text, counting words, formatting JSON, and working with images. These are small tasks, so I wanted the route from finding a tool to getting a result to stay short.

### The decisions behind the tools

**Keep processing in the browser.** The tools work locally, so the text and files they process do not need to be uploaded to a server. That makes privacy part of how the tools work.

**Organize by the job someone needs to do.** Tools are grouped by purpose, with search available through Ctrl K. As the collection grows, people can find a specific utility without browsing every page.

**Keep the utilities free to use.** The product is built around getting an everyday task done without an account or an upload getting in the way.

### What that made possible

ToolkitJar brings text, SEO, code and image utilities into one place. The contribution is in making small, useful interactions easy to find and keeping the content being processed on the user's own device. The site is live, and I continue adding tools.

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
