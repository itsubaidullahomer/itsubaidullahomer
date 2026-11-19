import type { CSSProperties } from "react";
import { intro } from "@/content/studio";
import { CountUp, Track } from "./fx";
import { Check } from "./icons";
import { Label } from "./label";

/**
 * Who this is, in one sentence that lights up word by word as it is read (--p is the reading
 * progress, --w each word's place in the sentence), with three plain promises and three numbers.
 */
export function Intro() {
  const words = intro.statement.split(" ");
  return (
    <Track as="section" mode="view" className="section intro" id="about">
      <div className="wrap intro__grid">
        <div className="intro__side">
          <Label n="01">{intro.kicker}</Label>
          <svg className="aster" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
            <path d="M50 4v92M4 50h92M17.500 17.500l65 65M82.500 17.500l-65 65" />
          </svg>
        </div>
        <div className="intro__main">
          <Track as="p" mode="read" className="statement">
            {words.map((word, i) => (
              <span key={i} style={{ "--w": (i / words.length).toFixed(3) } as CSSProperties}>
                {word}{" "}
              </span>
            ))}
          </Track>
          <ul className="intro__points">
            {intro.points.map((point, i) => (
              <li key={point} data-reveal style={{ "--d": i } as CSSProperties}>
                <span>
                  <Check size={14} />
                </span>
                {point}
              </li>
            ))}
          </ul>
          <dl className="stats" data-reveal>
            {intro.stats.map((stat) => (
              <div key={stat.label}>
                <dt>{stat.label}</dt>
                <dd>
                  <CountUp value={stat.value} suffix={stat.suffix} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Track>
  );
}
