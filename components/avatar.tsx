"use client";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { MessageSquare, ArrowUpRight } from "lucide-react";
import { Button } from "./ui/button";
import { useContact } from "./providers";
const ChatGPTConversation = dynamic(() => import("./chatgpt-conversation"), {
  ssr: false,
});
export function Avatar() {
  const [active, setActive] = useState(false);
  const [mode, setMode] = useState<"polite" | "unfiltered">("polite");
  const [result, setResult] = useState<string>();
  const { book } = useContact();
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
        <p className="avatar-caption">
          Experience my work in a conversation.
          <br />
          Connect your ChatGPT account and meet the AI me.
        </p>
        <Button
          id="avatar-start"
          onClick={() => setActive(true)}
          className="avatar-chat-button"
        >
          <MessageSquare size={14} /> Let’s talk <ArrowUpRight size={14} />
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
          <span>Powered by your ChatGPT plan</span>
          <button onClick={book} className="flex items-center gap-1">
            Meet the real me <ArrowUpRight size={10} />
          </button>
        </div>
      </div>
    </div>
  );
}
