"use client";

import { useBiz } from "./biz";

/** Shown only on a /for/… link: the page says who it was prepared for. */
export function MadeFor() {
  const { name } = useBiz();
  if (!name) return null;
  return (
    <p className="madefor">
      <span>Prepared for</span> <b>{name}</b>
    </p>
  );
}
