"use client";

import { useEffect, useRef, useState } from "react";
import { contact, studio } from "@/content/studio";
import { play } from "@/lib/sound";
import { useBiz } from "./biz";
import { Arrow, Check, Copy, Mail } from "./icons";
import { Label } from "./label";

/**
 * The way in. There is no server behind this form: it writes the email for the visitor and opens
 * it in their own mail app, so nothing they type is sent anywhere until they press send themselves.
 */
export function Contact() {
  const { name, setName } = useBiz();
  const [needs, setNeeds] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const business = name.trim();
  const subject = business ? `Website and marketing for ${business}` : "Website and marketing enquiry";
  const body = [
    "Hi Ubaid,",
    "",
    business ? `I run ${business}.` : "I run a local business.",
    needs.length ? `I’d like help with: ${needs.join(", ")}.` : "I’d like to hear what you could do for us.",
    ...(note.trim() ? ["", note.trim()] : []),
    "",
    "Thanks,",
  ].join("\n");
  const href = `mailto:${studio.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  function toggle(need: string) {
    setNeeds((list) => (list.includes(need) ? list.filter((item) => item !== need) : [...list, need]));
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(studio.email);
      play("success");
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2400);
    } catch {
      window.location.href = `mailto:${studio.email}`;
    }
  }

  return (
    <section className="contact" id="contact">
      {/* A giant line of type running across the top of the panel. */}
      <div className="shout" aria-hidden="true">
        <ul>
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <li key={n}>{contact.shout}</li>
          ))}
        </ul>
      </div>
      <div className="wrap contact__grid">
        <div className="contact__copy">
          <Label n="07">{contact.kicker}</Label>
          <h2 className="contact__title" data-reveal>
            {contact.title.before} <em>{contact.title.accent}</em>
          </h2>
          <p className="contact__text" data-reveal>
            {contact.text}
          </p>
          <a className="contact__mail" href={`mailto:${studio.email}`} data-reveal>
            {studio.email}
          </a>
        </div>

        <form className="form" data-reveal="right" onSubmit={(event) => event.preventDefault()}>
          <fieldset>
            <legend>{contact.needLabel}</legend>
            <div className="chips">
              {contact.needs.map((need) => (
                <button
                  key={need}
                  type="button"
                  className="chip"
                  aria-pressed={needs.includes(need)}
                  onClick={() => toggle(need)}
                >
                  {need}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="field">
            <span>{contact.nameLabel}</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={40}
              autoComplete="organization"
            />
          </label>
          <label className="field">
            <span>{contact.noteLabel}</span>
            <textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} maxLength={600} />
          </label>
          <div className="form__go">
            <a className="btn btn--gold" href={href}>
              <Mail size={18} /> {contact.send} <Arrow size={18} />
            </a>
            <button type="button" className="btn btn--ghost" onClick={copy} data-quiet>
              {copied ? <Check size={18} /> : <Copy size={18} />}
              <span aria-live="polite">{copied ? contact.copied : contact.copy}</span>
            </button>
          </div>
          <p className="form__note">{contact.reply}</p>
        </form>
      </div>
    </section>
  );
}

/** On phones, a "get in touch" button that floats at the bottom between the hero and the contact section. */
export function Sticky() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    // Hidden while the hero, the contact section or a pinned scene (which has its own button) is on screen.
    const quiet = Array.from(document.querySelectorAll("#top, #contact, [data-nosticky]"));
    const visible = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) visible.add(entry.target);
        else visible.delete(entry.target);
      }
      setOn(visible.size === 0);
    });
    for (const el of quiet) io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <a className="btn btn--dark sticky" href="#contact" data-on={on || undefined} tabIndex={on ? 0 : -1} aria-hidden={!on}>
      <Mail size={18} /> Get in touch
    </a>
  );
}
