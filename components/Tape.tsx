import { Box } from "./Icons";

/** A strip of printed tape that runs across the page. The text is repeated so the loop never shows a gap. */
export function Tape({ words, className = "" }: { words: string[]; className?: string }) {
  const run = (hidden: boolean) => (
    <div className="tape__run" aria-hidden={hidden || undefined}>
      {[...words, ...words].map((word, i) => (
        <span key={i} style={{ display: "contents" }}>
          <span>{word}</span>
          <Box />
        </span>
      ))}
    </div>
  );
  return (
    <div className={`tape ${className}`}>
      {run(false)}
      {run(true)}
    </div>
  );
}
