import type { CSSProperties } from "react";
import { hero, studio } from "@/content/studio";

/**
 * The opening curtain. The name rises letter by letter while a counter and a gold line follow what has
 * really loaded (the type, the portrait, the sounds and the page's script). At 100 the counter gives way to
 * an Enter button: pressing it is the visitor's first tap or click, which is when a browser allows sound,
 * so the curtain lifts with its sound and the hero plays in time with it. The behaviour lives in
 * lib/opening.ts, the look in styles/loader.css. Skipped on a reload, on a link to a part of the page,
 * and with reduced motion.
 */
export function Loader({ business }: { business?: string | null }) {
  const word = `${studio.name}.`;
  return (
    <div className="loader">
      <div className="loader__inner">
        <p className="loader__mark" aria-hidden="true">
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
        <div className="loader__enter">
          <button type="button" className="loader__go">
            <span className="loader__bars" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
            Enter
          </button>
          <button type="button" className="loader__quiet">
            Enter without sound
          </button>
        </div>
      </div>
      <div className="loader__foot" aria-hidden="true">
        <span>{studio.title}</span>
        {/* The opening script counts this up before React arrives, so React leaves its text alone. */}
        <b className="loader__count" suppressHydrationWarning>
          0
        </b>
      </div>
      <i className="loader__line" aria-hidden="true" />
    </div>
  );
}
