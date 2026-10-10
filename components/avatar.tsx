"use client";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Mic, MessageSquare, ArrowUpRight } from "lucide-react";
import { Button } from "./ui/button";
import { useContact } from "./providers";
const LiveSession = dynamic(() => import("./avatar-session"), {
  ssr: false,
  loading: () => (
    <p className="avatar-caption" role="status">
      Getting ready to meet you…
    </p>
  ),
});
export function Avatar() {
  const [active, setActive] = useState(false);
  const [mode, setMode] = useState<"polite" | "unfiltered">("polite");
  const [textOnly, setTextOnly] = useState(false);
  const { book } = useContact();
  useEffect(() => {
    const start = () => setActive(true);
    window.addEventListener("avatar:start", start);
    if (new URLSearchParams(location.search).get("talk") === "1") start();
    return () => window.removeEventListener("avatar:start", start);
  }, []);
  return (
    <div className="avatar-device" id="avatar">
      <div className="device-chrome">
        <span className="window-dots">
          <i />
          <i />
          <i />
        </span>
        <span>ubaid — {active ? "conversation" : "live"}</span>
        <span className="status">
          <i />
          {active ? "Here" : "Say hello"}
        </span>
      </div>
      <div className="avatar-picture">
        <Image
          src="/images/ubaid-portrait.jpg"
          alt="Ubaidullah Omer"
          fill
          sizes="(max-width: 540px) 290px, 365px"
          priority
        />
        <div className="avatar-label">
          <strong>A little like me.</strong>
          <span>An AI version. Same curiosity.</span>
        </div>
      </div>
      <div className="avatar-controls">
        {active ? (
          <LiveSession
            mode={mode}
            textOnly={textOnly}
            onEnd={() => setActive(false)}
          />
        ) : (
          <>
            <p className="avatar-caption">
              Ask about my work. Tell me about yours.
              <br />
              Or test my opinions on loading spinners.
            </p>
            <div className="button-row">
              <Button
                onClick={() => {
                  setTextOnly(false);
                  setActive(true);
                }}
              >
                <Mic size={13} /> Let’s talk
              </Button>
              <button
                aria-label="Type instead of speaking"
                onClick={() => {
                  setTextOnly(true);
                  setActive(true);
                }}
                className="button button-secondary"
                style={{ flex: 0, padding: "9px 12px" }}
              >
                <MessageSquare size={13} />
              </button>
            </div>
          </>
        )}
        <div className="avatar-mode">
          <div className="mode-toggle" aria-label="Conversation tone">
            <button
              aria-pressed={mode === "polite"}
              onClick={() => setMode("polite")}
            >
              Polite
            </button>
            <button
              aria-pressed={mode === "unfiltered"}
              onClick={() => setMode("unfiltered")}
            >
              Unfiltered
            </button>
          </div>
          <button onClick={book} className="flex items-center gap-1">
            Meet the real me <ArrowUpRight size={10} />
          </button>
        </div>
      </div>
    </div>
  );
}
