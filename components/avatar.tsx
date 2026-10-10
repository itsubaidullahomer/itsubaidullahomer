"use client";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { MessageSquare, ArrowUpRight } from "lucide-react";
import { Button } from "./ui/button";
const ChatGPTConversation = dynamic(() => import("./chatgpt-conversation"), {
  ssr: false,
});
export function Avatar({ available }: { available: boolean }) {
  const [active, setActive] = useState(false);
  const [mode, setMode] = useState<"polite" | "unfiltered">("polite");
  const [result, setResult] = useState<string>();
  useEffect(() => {
    const start = () => setActive(true);
    window.addEventListener("avatar:start", start);
    const params = new URLSearchParams(location.search);
    const frame = requestAnimationFrame(() => {
      if (params.get("talk") === "1") {
        setResult(params.get("chatgpt") || undefined);
        start();
        params.delete("talk");
        params.delete("chatgpt");
        history.replaceState(
          null,
          "",
          `${location.pathname}${params.size ? `?${params}` : ""}${location.hash}`,
        );
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("avatar:start", start);
    };
  }, []);
  return (
    <div className="avatar-device" id="avatar">
      <div className="device-chrome">
        <span className="window-dots">
          <i />
          <i />
          <i />
        </span>
        <span>ubaid — AI demo</span>
        <span className="status">
          {available && <i />}
          {available ? (active ? "Here" : "Ready") : "In development"}
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
          <strong>Meet AI Ubaid.</strong>
          <span>An AI version. Same curiosity.</span>
        </div>
      </div>
      <div className="avatar-controls">
        <p className="avatar-caption">
          An AI guide to my projects, process, and experience.
        </p>
        <Button
          id="avatar-start"
          onClick={() => setActive(true)}
          className="avatar-chat-button"
          disabled={!available}
        >
          {available ? (
            <>
              <MessageSquare size={14} /> Ask about my work
              <ArrowUpRight size={14} />
            </>
          ) : (
            "Coming soon"
          )}
        </Button>
        {active && (
          <ChatGPTConversation
            mode={mode}
            onModeChange={setMode}
            result={result}
            onClose={() => {
              setActive(false);
              setResult(undefined);
            }}
          />
        )}
        <div className="avatar-mode">
          <span>Text conversation · Your ChatGPT plan</span>
        </div>
      </div>
    </div>
  );
}
