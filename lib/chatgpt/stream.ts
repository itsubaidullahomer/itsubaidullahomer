// Shared by the server's Responses adapter and the browser's local SSE consumer.
// Handles CRLF, multi-line data, fragmented UTF-8 and a final unterminated frame.
export async function* readSSE(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let data: string[] = [];
  const takeLine = (line: string) => {
    if (line.endsWith("\r")) line = line.slice(0, -1);
    if (!line) {
      const frame = data.join("\n");
      data = [];
      return frame || null;
    }
    if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
    return null;
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      pending += done
        ? decoder.decode()
        : decoder.decode(value, { stream: true });
      if (pending.length > 200000) throw new Error("Stream frame too large");
      let newline: number;
      while ((newline = pending.indexOf("\n")) >= 0) {
        const frame = takeLine(pending.slice(0, newline));
        pending = pending.slice(newline + 1);
        if (frame) yield frame;
      }
      if (done) {
        if (pending) takeLine(pending);
        if (data.length) yield data.join("\n");
        break;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
