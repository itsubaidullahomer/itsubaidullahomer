import type { ReactNode } from "react";

/** A section's number and name, written as { 02 } What I do. */
export function Label({ n, children }: { n: string; children: ReactNode }) {
  return (
    <p className="label" data-reveal>
      <b>{`{ ${n} }`}</b>
      {children}
    </p>
  );
}
