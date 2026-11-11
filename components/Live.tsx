"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { site } from "@/content/site";

const hhmm = (timeZone?: string) =>
  new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone }).format(new Date());

/** The current minute, as a number that changes on the minute. 0 on the server, so nothing time-based is in the HTML. */
function subscribeMinute(notify: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  const next = () => {
    timer = setTimeout(() => {
      notify();
      next();
    }, 60_000 - (Date.now() % 60_000) + 50);
  };
  next();
  return () => clearTimeout(timer);
}
const useMinute = () =>
  useSyncExternalStore(
    subscribeMinute,
    () => Math.floor(Date.now() / 60_000),
    () => 0,
  );

/** The visitor's window size, live. Null on the server. */
function subscribeResize(notify: () => void) {
  addEventListener("resize", notify);
  return () => removeEventListener("resize", notify);
}
const useWindowSize = () =>
  useSyncExternalStore(
    subscribeResize,
    () => `${innerWidth}×${innerHeight}`,
    () => null,
  );

/** The sender's local time in Pakistan. */
export function SenderClock() {
  const minute = useMinute();
  return <span>{minute ? hhmm(site.timeZone) : "--:--"}</span>;
}

/** The visitor's own time zone and clock, and how far that is from the sender. */
export function ShipTo() {
  const minute = useMinute();
  if (!minute) {
    return (
      <>
        <span>Wherever your browser is</span>
        <span className="mono lbl-clock">--:-- your time</span>
      </>
    );
  }
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  const city = zone.includes("/") ? zone.split("/").pop()!.replace(/_/g, " ") : "Your browser";
  const diff = site.utcOffset + new Date().getTimezoneOffset() / 60;
  const gap =
    diff === 0
      ? "same time zone as me"
      : `${Math.abs(diff).toLocaleString("en", { maximumFractionDigits: 1 })} h ${diff > 0 ? "behind" : "ahead of"} me`;
  return (
    <>
      <span>
        {city}, {gap}
      </span>
      <span className="mono lbl-clock">{hhmm()} your time</span>
    </>
  );
}

type Reading = { kb: number; cached: boolean; seconds: number | null; pieces: number };

/** What the browser itself recorded for this page load. Nothing here is hard-coded. */
function read(): Reading | null {
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  if (!nav) return null;
  const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  let sent = nav.transferSize;
  let stored = nav.encodedBodySize;
  for (const r of resources) {
    sent += r.transferSize;
    stored += r.encodedBodySize;
  }
  const end = nav.loadEventEnd || nav.domContentLoadedEventEnd;
  // A repeat visit is served from the browser's cache: nothing travels, so report what is stored.
  const cached = sent < stored * 0.2;
  return {
    kb: (cached ? stored : sent) / 1024,
    cached,
    seconds: end ? (end - nav.startTime) / 1000 : null,
    pieces: resources.length + 1,
  };
}

/** Weight, delivery time and dimensions: the label's live fields. */
export function LiveMetrics() {
  const [reading, setReading] = useState<Reading | null>(null);
  const size = useWindowSize();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    // Wait for the load event, then a moment more, so the browser has finished its own bookkeeping.
    const measure = () => {
      timer = setTimeout(() => setReading(read()), 400);
    };
    if (document.readyState === "complete") measure();
    else addEventListener("load", measure, { once: true });
    return () => {
      clearTimeout(timer);
      removeEventListener("load", measure);
    };
  }, []);

  return (
    <dl className="lbl-metrics">
      <div>
        <dt className="field">Weight</dt>
        <dd>
          <b className="display">{reading ? Math.round(reading.kb).toLocaleString("en") : "···"}</b>
          <span className="mono">KB</span>
        </dd>
        <dd className="lbl-note mono">
          {reading
            ? reading.cached
              ? `${reading.pieces} pieces, from your cache`
              : `in ${reading.pieces} pieces`
            : "weighing"}
        </dd>
      </div>
      <div>
        <dt className="field">Delivery time</dt>
        <dd>
          <b className="display">{reading?.seconds != null ? reading.seconds.toFixed(2) : "···"}</b>
          <span className="mono">SEC</span>
        </dd>
        <dd className="lbl-note mono">door to door</dd>
      </div>
      <div>
        <dt className="field">Dimensions</dt>
        <dd>
          <b className="display">{size ?? "···"}</b>
          <span className="mono">PX</span>
        </dd>
        <dd className="lbl-note mono">your screen, right now</dd>
      </div>
    </dl>
  );
}
