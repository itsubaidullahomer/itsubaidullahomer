import type { CSSProperties } from "react";
import { hero, studio } from "@/content/studio";

/**
 * The opening curtain, shown on the first visit of a session: the name rises letter by letter over a count
 * to 100 and a gold line, then the curtain lifts and the hero plays underneath it. It is all stylesheet
 * (styles/loader.css), so it never waits on the network or the script, and it is skipped on a reload, on a
 * link to a part of the page, and with reduced motion (see the script in app/layout.tsx).
 */
export function Loader({ business }: { business?: string | null }) {
  const word = `${studio.name}.`;
  return (
    <div className="loader" aria-hidden="true">
      <div className="loader__inner">
        <p className="loader__mark">
          {word.split("").map((letter, i) => (
            <span key={i} style={{ "--d": i } as CSSProperties}>
              {letter}
            </span>
          ))}
        </p>
        <p className="loader__for">
          {business ? (
            <>
              Prepared for <b>{business}</b>
            </>
          ) : (
            hero.eyebrow.join(" · ")
          )}
        </p>
      </div>
      <div className="loader__foot">
        <span>{studio.title}</span>
        <b className="loader__count" />
      </div>
      <i className="loader__line" />
    </div>
  );
}
