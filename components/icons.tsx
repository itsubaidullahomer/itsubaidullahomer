import type { ReactNode } from "react";

/** A small set of chunky line icons drawn for this site. They take the text colour. */
function Svg({ children, size = 24, fill = false }: { children: ReactNode; size?: number; fill?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={fill ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={fill ? 0 : 2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}
type P = { size?: number };

export const PhoneIcon = ({ size }: P) => (
  <Svg size={size} fill>
    <path d="M6.6 2.5h2.2c.6 0 1.1.4 1.3 1l.9 3.3c.1.5 0 1-.4 1.4L9 9.800c1.100 2.200 3 4.100 5.200 5.200l1.600-1.600c.4-.4.900-.5 1.400-.4l3.300.900c.6.2 1 .7 1 1.300v2.200c0 1.200-1 2.100-2.100 2.100C10.300 19.500 4.500 13.700 4.500 4.600c0-1.200.900-2.100 2.100-2.100z" />
  </Svg>
);
export const Arrow = ({ size }: P) => (
  <Svg size={size}>
    <path d="M4 12h15M13 6l6 6-6 6" />
  </Svg>
);
export const ArrowDown = ({ size }: P) => (
  <Svg size={size}>
    <path d="M12 4v15M6 13l6 6 6-6" />
  </Svg>
);
export const ArrowOut = ({ size }: P) => (
  <Svg size={size}>
    <path d="M7 17 17 7M9 7h8v8" />
  </Svg>
);
export const Star = ({ size }: P) => (
  <Svg size={size} fill>
    <path d="m12 2.6 2.7 5.8 6.3.8-4.600 4.400 1.200 6.300L12 16.800l-5.600 3.100 1.200-6.300L3 9.200l6.300-.8z" />
  </Svg>
);
export const Pin = ({ size }: P) => (
  <Svg size={size} fill>
    <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.500A2.500 2.500 0 1 1 12 6.500a2.500 2.500 0 0 1 0 5z" />
  </Svg>
);
export const Heart = ({ size }: P) => (
  <Svg size={size} fill>
    <path d="M12 21s-8-5.200-8-11a4.500 4.500 0 0 1 8-2.800A4.500 4.500 0 0 1 20 10c0 5.800-8 11-8 11z" />
  </Svg>
);
export const SearchIcon = ({ size }: P) => (
  <Svg size={size}>
    <circle cx="10.500" cy="10.500" r="6.500" />
    <path d="m20 20-4.600-4.600" />
  </Svg>
);
export const Mail = ({ size }: P) => (
  <Svg size={size}>
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="m4 8 8 6 8-6" />
  </Svg>
);
export const Copy = ({ size }: P) => (
  <Svg size={size}>
    <rect x="8" y="8" width="12" height="12" rx="2.500" />
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </Svg>
);
export const Check = ({ size }: P) => (
  <Svg size={size}>
    <path d="m4.500 12.500 5 5 10-11" />
  </Svg>
);
export const Megaphone = ({ size }: P) => (
  <Svg size={size}>
    <path d="M4 10v4a1 1 0 0 0 1 1h2l8 4V5L7 9H5a1 1 0 0 0-1 1zM8 15v4a1 1 0 0 0 1 1h1.500M18.500 9.500a3.500 3.500 0 0 1 0 5" />
  </Svg>
);
export const Wrench = ({ size }: P) => (
  <Svg size={size}>
    <path d="M14.500 6a4 4 0 0 1 5-3l-2.700 2.700.5 2 2 .5L22 5.500a4 4 0 0 1-5.300 4.800L8 19a2.100 2.100 0 0 1-3-3l8.700-8.700c-.2-.4.200-.9.800-1.300z" />
  </Svg>
);
export const Sparkle = ({ size }: P) => (
  <Svg size={size} fill>
    <path d="M12 2c.7 5.500 2.500 7.300 8 8-5.500.7-7.300 2.500-8 8-.7-5.500-2.500-7.300-8-8 5.500-.7 7.300-2.500 8-8zM19 16c.3 2.200 1 2.900 3 3.200-2 .3-2.700 1-3 3-.3-2-1-2.700-3-3 2-.3 2.700-1 3-3.200z" />
  </Svg>
);

/** The service van that drives through the "working together" section. Faces right. */
export function Van({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 70" aria-hidden="true" focusable="false">
      <g stroke="var(--ink)" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round">
        <path d="M6 14a6 6 0 0 1 6-6h58a6 6 0 0 1 6 6v36H6z" fill="var(--sun)" />
        <path d="M76 22h18c3 0 5 1 7 4l11 14c1 1 2 3 2 5v5H76z" fill="var(--white)" />
        <path d="M84 28h10l8 11H84z" fill="var(--blue)" />
        <path d="M6 50h108" />
        <circle cx="30" cy="54" r="9" fill="var(--ink)" />
        <circle cx="30" cy="54" r="2" fill="var(--white)" stroke="none" />
        <circle cx="92" cy="54" r="9" fill="var(--ink)" />
        <circle cx="92" cy="54" r="2" fill="var(--white)" stroke="none" />
        <path d="M18 22h46M18 32h30" stroke="var(--ink)" />
      </g>
    </svg>
  );
}
