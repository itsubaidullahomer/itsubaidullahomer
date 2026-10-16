"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

const PortfolioGuide = dynamic(() => import("./avatar-guide-portfolio"), {
  ssr: false,
});
const STORAGE_KEY = "portfolio-avatar-preview";
const EVENT = "portfolio-avatar-preview-change";
function subscribe(listener: () => void) {
  window.addEventListener(EVENT, listener);
  window.addEventListener("popstate", listener);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("popstate", listener);
  };
}
function enabled() {
  const requested = new URLSearchParams(window.location.search).get(
    "avatarGuide",
  );
  try {
    return requested === "1" || sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return requested === "1";
  }
}

/** Opt-in only. No 3D or voice code is downloaded during a normal site visit. */
export function AvatarGuideGate() {
  const pathname = usePathname();
  const active = useSyncExternalStore(subscribe, enabled, () => false);
  const show = active && !pathname.startsWith("/avatar-");
  useEffect(() => {
    if (active) {
      try {
        sessionStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* private storage */
      }
    }
    document.body.classList.toggle("avatar-guide-enabled", show);
    return () => document.body.classList.remove("avatar-guide-enabled");
  }, [active, show]);
  const close = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* private storage */
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("avatarGuide");
    window.history.replaceState(window.history.state, "", url);
    window.dispatchEvent(new Event(EVENT));
  };
  return show ? <PortfolioGuide onClose={close} /> : null;
}
