"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/** Supporting card content stays visible on desktop and expands inline on phones. */
export function MobileCardDetails({
  label,
  children,
  heading = false,
  meta,
}: {
  label: string;
  children: ReactNode;
  heading?: boolean;
  meta?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="mobile-card-details" data-open={open}>
      <button
        type="button"
        className="mobile-card-details-trigger"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <span>{label}</span>
        {meta && <small>{meta}</small>}
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      {heading && (
        <div className="mobile-card-details-heading">
          <h4>{label}</h4>
          {meta && <span>{meta}</span>}
        </div>
      )}
      <div id={id} className="mobile-card-details-content">
        {children}
      </div>
    </div>
  );
}
