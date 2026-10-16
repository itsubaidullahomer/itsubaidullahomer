export type TututorShot = {
  src: string;
  width: number;
  height: number;
  label: string;
  alt: string;
  caption: string;
  format?: "phone" | "portrait";
};
export type TututorView = {
  id: string;
  label: string;
  subtitle: string;
  product: string;
  title: string;
  decision: string;
  accent: string;
  shots: TututorShot[];
};
const S = "/images/tututor/showcase";
const M = "/images/tututor/mobile";
const J = "/images/tututor/journey";

export const tututorViews: TututorView[] = [
  {
    id: "toolkit",
    label: "AI toolkit",
    subtitle: "Tools, tutors & assistant",
    product: "Tututor.AI",
    title: "Start with what a teacher needs to do.",
    accent: "mint",
    decision:
      "Organize 40+ tools around teaching tasks, with curriculum context built in.",
    shots: [
      {
        src: `${S}/tututor-catalog.jpg`,
        width: 1600,
        height: 757,
        label: "Tool library",
        alt: "Tututor’s AI tools grouped into planning and creating teaching material",
        caption:
          "Lesson plans, quizzes, rubrics and games, grouped by the job the teacher came to do.",
      },
      {
        src: `${S}/tututor-tutors.jpg`,
        width: 1600,
        height: 762,
        label: "Virtual tutors",
        alt: "A teacher’s library of custom AI tutors in Tututor",
        caption:
          "Teachers create a tutor for a topic, then share it with their class by link or QR code.",
      },
      {
        src: `${S}/tututor-assistant.jpg`,
        width: 1600,
        height: 752,
        label: "AI assistant",
        alt: "The Tututor teacher assistant showing a generated table",
        caption:
          "An assistant for teaching work, with files, voice input, tables and follow-up requests.",
      },
    ],
  },
  {
    id: "editor",
    label: "Document editor",
    subtitle: "Write, refine & illustrate",
    product: "Tututor.AI",
    title: "Keep the teacher in the document.",
    accent: "violet",
    decision:
      "Bring AI to the selected passage, so editing and generation happen in the same place.",
    shots: [
      {
        src: `${J}/editor-today.png`,
        width: 1904,
        height: 892,
        label: "AI actions",
        alt: "Tututor’s document editor with selected text and the improve, expand and shorten menu",
        caption:
          "Select a passage to improve, expand, shorten or turn it into a table, without leaving the editor.",
      },
      {
        src: `${S}/editor-live.jpg`,
        width: 853,
        height: 731,
        label: "Editing close-up",
        alt: "Live Tututor editor with a selected lesson-plan passage and contextual AI actions",
        caption:
          "A close-up captured in the live app: the selected passage stays in context while the teacher chooses an AI action.",
      },
      {
        src: `${S}/tututor-editor-images.jpg`,
        width: 1600,
        height: 763,
        label: "Image tools",
        alt: "The editor image panel with stock images, AI generation, pictograms and a gallery",
        caption:
          "Stock images, pictograms and AI-generated illustrations sit beside the material being written.",
      },
      {
        src: `${S}/tututor-editor-inline.jpg`,
        width: 1600,
        height: 763,
        label: "Working document",
        alt: "An illustrated teaching document inside the Tututor editor",
        caption:
          "The generated result becomes a working document, with formatting and media in the same workspace.",
      },
    ],
  },
  {
    id: "mindmaps",
    label: "Visual learning",
    subtitle: "Editable, shareable mind maps",
    product: "Tututor.AI",
    title: "Give a topic a shape students can follow.",
    accent: "amber",
    decision:
      "Make the output editable, printable and ready to send to the class on EduNova.",
    shots: [
      {
        src: `${S}/tututor-mindmap.jpg`,
        width: 1600,
        height: 758,
        label: "Mind maps",
        alt: "A Tututor mind map showing the causes and consequences of the Second World War",
        caption:
          "A topic or document becomes a mind map, with four layouts and controls to edit, export or share it.",
      },
    ],
  },
  {
    id: "school",
    label: "School platform",
    subtitle: "A connected teaching day",
    product: "EduNova",
    title: "Connect the work around the classroom.",
    accent: "blue",
    decision:
      "Build on one shared backend so teaching, school administration and family communication stay connected.",
    shots: [
      {
        src: `${S}/edunova-dashboard.jpg`,
        width: 1600,
        height: 760,
        label: "Teacher dashboard",
        alt: "EduNova demo teacher dashboard with quick actions, school notices and a timetable",
        caption:
          "The day’s classes, urgent notices and frequent actions meet on one dashboard.",
      },
      {
        src: `${S}/edunova-timetable.jpg`,
        width: 1600,
        height: 755,
        label: "Weekly timetable",
        alt: "EduNova’s weekly timetable for a demo school",
        caption:
          "Classes, exams and school events share a calendar, giving the teacher one view of the week.",
      },
      {
        src: `${S}/edunova-messages.jpg`,
        width: 1600,
        height: 759,
        label: "Family messages",
        alt: "EduNova demo conversation with a family, showing attachments and reply controls",
        caption:
          "Realtime family messaging includes attachments, read receipts and control over who can reply.",
      },
    ],
  },
  {
    id: "mobile",
    label: "Mobile apps",
    subtitle: "Teachers, students & families",
    product: "EduNova · iOS & Android",
    title: "Three apps. Three different school days.",
    accent: "blue",
    decision:
      "Give each person a focused app, while keeping their information on the same backend as the web platform.",
    shots: [
      {
        src: `${M}/profesores-home.jpg`,
        width: 720,
        height: 1557,
        label: "Teacher home",
        format: "phone",
        alt: "Profesores app showing the next class and a take-register action",
        caption:
          "Teachers see the next class, take the register and move into the work for their day.",
      },
      {
        src: `${M}/alumnos-home.jpg`,
        width: 720,
        height: 1557,
        label: "Student home",
        format: "phone",
        alt: "Alumnos app home with homework, school modules and attendance",
        caption:
          "Students get their own view of homework, grades, timetable and the class board.",
      },
      {
        src: `${M}/familias-tareas.jpg`,
        width: 720,
        height: 1557,
        label: "Family homework",
        format: "phone",
        alt: "Familias app showing homework for a demo child",
        caption:
          "Families can follow their children’s homework alongside grades, attendance and school messages.",
      },
      {
        src: `${M}/profesores-horario.jpg`,
        width: 720,
        height: 1557,
        label: "Teacher timetable",
        format: "phone",
        alt: "Profesores app weekly timetable",
        caption:
          "A weekly timetable keeps classroom planning close at hand on the teacher’s phone.",
      },
      {
        src: `${M}/alumnos-notas.jpg`,
        width: 720,
        height: 1557,
        label: "Student grades",
        format: "phone",
        alt: "Alumnos app grades screen with demo school data",
        caption:
          "A dedicated grades view gives students a place to check their school results.",
      },
      {
        src: `${M}/familias-asistencia.jpg`,
        width: 720,
        height: 1557,
        label: "Family attendance",
        format: "phone",
        alt: "Familias app attendance screen for a demo child’s school day",
        caption:
          "Families can check attendance from their own app, connected to the classroom record.",
      },
      {
        src: `${M}/profesores-deberes.jpg`,
        width: 720,
        height: 1557,
        label: "Teacher homework",
        format: "phone",
        alt: "Profesores app homework management screen",
        caption:
          "Teachers manage homework from mobile, alongside the web tools they already use.",
      },
      {
        src: `${M}/familias-mensajes.jpg`,
        width: 720,
        height: 1557,
        label: "Family inbox",
        format: "phone",
        alt: "Familias app school messages using demo content",
        caption:
          "School communication reaches families on their phones, with push notifications.",
      },
    ],
  },
  {
    id: "evolution",
    label: "The evolution",
    subtitle: "From the first rebuild onward",
    product: "The product journey",
    title: "The product kept growing. So did my role.",
    accent: "rose",
    decision:
      "Rebuild the parts that hold the product back, and carry the work from the data model through to release.",
    shots: [
      {
        src: `${J}/01-inherited.png`,
        width: 1176,
        height: 568,
        label: "Where it started",
        alt: "The inherited Tututor app with a blue sidebar and AI tool cards",
        caption:
          "I joined to fix one bug in this app, then proposed a rebuild to give the product a more dependable foundation.",
      },
      {
        src: `${J}/03-react-rebuild.png`,
        width: 1912,
        height: 959,
        label: "The React rebuild",
        alt: "The rebuilt Tututor React app with illustrated teaching tool cards",
        caption:
          "My brother designed the new version. I rebuilt it in React and Redux, initially using Firebase.",
      },
      {
        src: `${J}/editor-v1.png`,
        width: 1550,
        height: 800,
        label: "The first editor",
        alt: "Tututor’s original generated-text view with copy, save and download actions",
        caption:
          "The first editor was a read-only result. Later, I replaced it with the document workspace shown here today.",
      },
      {
        src: `${J}/native-concepts.jpg`,
        width: 1400,
        height: 2033,
        label: "Native concepts",
        format: "portrait",
        alt: "Three design concepts for the native Familias app, including the Nova owl mascot",
        caption:
          "Design concepts for the next native Familias app. The Nova owl direction was selected; these are concepts, not released screens.",
      },
    ],
  },
];
