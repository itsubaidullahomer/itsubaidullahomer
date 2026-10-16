/** Parses SSE across arbitrary network chunk boundaries. Bounded to avoid untrusted growth. */
export class EventDecoder {
  private buffer = "";
  push(chunk: string): unknown[] {
    this.buffer = (this.buffer + chunk).replace(/\r\n/g, "\n");
    if (this.buffer.length > 100_000)
      throw new Error("Response event exceeds the size limit.");
    const events: unknown[] = [];
    let boundary: number;
    while ((boundary = this.buffer.indexOf("\n\n")) !== -1) {
      const block = this.buffer.slice(0, boundary);
      this.buffer = this.buffer.slice(boundary + 2);
      const data = block
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      if (data && data !== "[DONE]") events.push(JSON.parse(data));
    }
    return events;
  }
}
