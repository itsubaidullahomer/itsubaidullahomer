export type SiteTarget = {
  sectionId: string;
  selector: string;
  path: string;
  title: string;
  summary: string;
  keyFacts: string[];
  kind:
    | "section"
    | "project"
    | "skill"
    | "experience"
    | "service"
    | "faq"
    | "principle"
    | "writing";
};
