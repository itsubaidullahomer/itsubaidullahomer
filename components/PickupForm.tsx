"use client";

import { useState } from "react";
import { ArrowRight } from "./Icons";

/**
 * A pickup slip. There is no server behind it: it writes the email for you
 * and hands it to your own mail app, so nothing you type is stored here.
 */
export function PickupForm({ email, services }: { email: string; services: string[] }) {
  const options = [...services, "Something else"];
  const [name, setName] = useState("");
  const [service, setService] = useState(options[0]);
  const [details, setDetails] = useState("");
  const [copied, setCopied] = useState(false);

  const subject = `Pickup request: ${service}`;
  const body = [`Hi Ubaid,`, ``, details.trim() || `(what you're shipping)`, ``, name.trim() ? `— ${name.trim()}` : ``]
    .join("\n")
    .trim();
  const href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked: the address is on the page to select by hand.
    }
  };

  return (
    <form
      className="pslip"
      onSubmit={(event) => {
        event.preventDefault();
        window.location.href = href;
      }}
    >
      <div className="pslip__head">
        <b className="stencil">Pickup request</b>
        <span className="field">Form UO-1 · fill in block capitals, or don&rsquo;t</span>
      </div>

      <label className="pslip__field">
        <span className="field">01 · Your name</span>
        <input
          type="text"
          name="name"
          autoComplete="name"
          placeholder="Who is sending?"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>

      <fieldset className="pslip__field">
        <legend className="field">02 · Service</legend>
        <div className="pslip__options">
          {options.map((option) => (
            <label key={option}>
              <input
                type="radio"
                name="service"
                value={option}
                checked={service === option}
                onChange={() => setService(option)}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="pslip__field">
        <span className="field">03 · What are you shipping?</span>
        <textarea
          name="details"
          rows={4}
          placeholder="The product, where it is today, and when it needs to arrive."
          value={details}
          onChange={(event) => setDetails(event.target.value)}
        />
      </label>

      <div className="pslip__foot">
        <button className="btn btn--blaze" type="submit">
          Write the email <ArrowRight />
        </button>
        <button className="btn btn--ghost" type="button" onClick={copy}>
          <span aria-live="polite">{copied ? "Copied" : "Copy my address"}</span>
        </button>
        <p className="field">Opens your mail app with this filled in. Nothing is stored on this site.</p>
      </div>
    </form>
  );
}
