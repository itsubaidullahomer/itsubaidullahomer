"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { ScrollReveals } from "./scroll-reveals";
import { useRouter } from "next/navigation";
import { MotionConfig } from "motion/react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, ArrowUpRight, Copy, Check } from "lucide-react";
import { Button } from "./ui/button";
import { site } from "@/content/site";
const CalBooking = dynamic(() => import("./booking"), {
  ssr: false,
  loading: () => <p className="loading-copy">Opening the calendar…</p>,
});
const ContactContext = createContext({ book: () => {}, talk: () => {} });
export const useContact = () => useContext(ContactContext);
export function Providers({ children }: { children: ReactNode }) {
  const [booking, setBooking] = useState(false);
  const router = useRouter();
  function talk() {
    if (location.pathname !== "/") {
      router.push("/?talk=1#avatar");
      return;
    }
    document.getElementById("avatar")?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "center",
    });
    window.dispatchEvent(new Event("avatar:start"));
  }
  return (
    <MotionConfig reducedMotion="user">
      <ScrollReveals />
      <ContactContext.Provider value={{ book: () => setBooking(true), talk }}>
        {children}
        <Dialog.Root open={booking} onOpenChange={setBooking}>
          <Dialog.Portal>
            <Dialog.Overlay className="dialog-overlay" />
            <Dialog.Content className="dialog-content booking-dialog">
              <Dialog.Title>Let’s talk about your project.</Dialog.Title>
              <Dialog.Description>
                A little context is a good place to start.
              </Dialog.Description>
              <Dialog.Close className="dialog-close" aria-label="Close booking">
                <X size={20} />
              </Dialog.Close>
              {process.env.NEXT_PUBLIC_CAL_LINK ? (
                <CalBooking />
              ) : (
                <div className="booking-fallback">
                  <p>
                    Send me what you’re building, what needs to change, and any
                    timeline you have in mind. We’ll find a time to talk.
                  </p>
                  <a
                    className="button button-primary"
                    href={`mailto:${site.email}`}
                  >
                    Email Ubaid <ArrowUpRight size={16} />
                  </a>
                  <p className="mono">{site.email}</p>
                </div>
              )}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </ContactContext.Provider>
    </MotionConfig>
  );
}
export function BookButton({
  children = "Book a call",
  variant = "primary",
  className,
}: {
  children?: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}) {
  const { book } = useContact();
  return (
    <Button variant={variant} className={className} onClick={book}>
      {children}
    </Button>
  );
}
export function TalkButton({
  children = "Talk to me",
  variant = "primary",
}: {
  children?: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
}) {
  const { talk } = useContact();
  return (
    <Button variant={variant} onClick={talk}>
      {children}
    </Button>
  );
}
export function CopyEmail({ compact = false }: { compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(site.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      location.href = `mailto:${site.email}`;
    }
  }
  return (
    <button
      onClick={copy}
      className={compact ? "text-link copy-link" : "button button-secondary"}
      aria-label={copied ? "Email copied" : "Copy email address"}
    >
      <span aria-live="polite">
        {copied ? "Email copied" : compact ? "copy email" : "Copy email"}
      </span>
      <span className="copy-symbol" aria-hidden="true">
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </span>
    </button>
  );
}
