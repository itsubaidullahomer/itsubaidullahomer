import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = { viewBox: "0 0 64 64", fill: "none", "aria-hidden": true } as const;

/** Handling marks, drawn the way they are printed on a crate: thick, flat, one colour. */
export function Fragile(p: P) {
  return (
    <svg {...base} {...p}>
      <path
        d="M18 6h28c0 14-3 24-11 27v17h9v6H20v-6h9V33C21 30 18 20 18 6Z"
        fill="currentColor"
      />
      <path d="M31 6l-4 9 7 4-4 9" stroke="var(--mark-bg, #f7f4ec)" strokeWidth="3" />
    </svg>
  );
}
export function ThisSideUp(p: P) {
  return (
    <svg {...base} {...p}>
      <path d="M17 6 4 24h8v24h10V24h8L17 6Zm30 0L34 24h8v24h10V24h8L47 6Z" fill="currentColor" />
      <path d="M4 54h56v6H4z" fill="currentColor" />
    </svg>
  );
}
export function KeepDry(p: P) {
  return (
    <svg {...base} {...p}>
      <path d="M32 6C16 6 5 17 4 30c4-4 8-4 12 0 4-4 8-4 12 0V48a8 8 0 0 0 16 0h-6a2 2 0 0 1-4 0V30c4-4 8-4 12 0 4-4 8-4 12 0C59 17 48 6 32 6Z" fill="currentColor" />
      <path d="M10 44l-3 8m9-10-3 8m39-6 3 8m-9-10 3 8" stroke="currentColor" strokeWidth="3" strokeLinecap="square" />
    </svg>
  );
}
export function Tracked(p: P) {
  return (
    <svg {...base} {...p}>
      <path d="M32 4c-11 0-20 9-20 20 0 15 20 36 20 36s20-21 20-36C52 13 43 4 32 4Zm0 28a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" fill="currentColor" />
    </svg>
  );
}
export const handlingIcon = {
  fragile: Fragile,
  tracked: Tracked,
  up: ThisSideUp,
  dry: KeepDry,
} as const;

const small = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.5, "aria-hidden": true } as const;
export function ArrowRight(p: P) {
  return (
    <svg {...small} {...p}>
      <path d="M4 12h15m-6-7 7 7-7 7" />
    </svg>
  );
}
export function ArrowDown(p: P) {
  return (
    <svg {...small} {...p}>
      <path d="M12 4v15m-7-6 7 7 7-7" />
    </svg>
  );
}
export function ArrowUpRight(p: P) {
  return (
    <svg {...small} {...p}>
      <path d="M6 18 18 6M8 6h10v10" />
    </svg>
  );
}
/** A small parcel, used as a bullet on the tape and as the site mark. */
export function Box(p: P) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
      <path d="M12 1 2 6v12l10 5 10-5V6L12 1Zm0 2.3 6.9 3.4L12 10.2 5.1 6.7 12 3.3ZM4 8.3l7 3.5v8.6l-7-3.5V8.3Zm9 12.1v-8.6l7-3.5v8.6l-7 3.5Z" />
    </svg>
  );
}
/** A hand-drawn arrow for marker notes. */
export function Scribble(p: P) {
  return (
    <svg viewBox="0 0 90 60" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
      <path d="M4 8c22-6 52 0 68 38" />
      <path d="M58 40l15 7 5-17" />
    </svg>
  );
}
