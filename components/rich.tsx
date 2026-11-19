import { Fragment } from "react";

/** Renders a heading where the part between *stars* is set in the italic serif accent. */
export function Rich({ text }: { text: string }) {
  return text.split("*").map((part, i) => (i % 2 ? <em key={i}>{part}</em> : <Fragment key={i}>{part}</Fragment>));
}
