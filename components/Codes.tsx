import QRCode from "qrcode";
// The encoder ships without types; only its bit pattern is used.
import Code128 from "jsbarcode/bin/barcodes/CODE128/CODE128_AUTO.js";

/** A real Code 128 barcode, rendered on the server as one SVG path. */
export function Barcode({ value, className }: { value: string; className?: string }) {
  const Encoder = (Code128 as { default?: unknown }).default ?? Code128;
  const bits: string = new (Encoder as new (data: string, options: object) => { encode(): { data: string } })(
    value,
    {},
  ).encode().data;
  let d = "";
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] !== "1") continue;
    let w = 1;
    while (bits[i + w] === "1") w++;
    d += `M${i} 0h${w}v40h-${w}z`;
    i += w - 1;
  }
  return (
    <svg
      className={className}
      viewBox={`0 0 ${bits.length} 40`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Barcode: ${value}`}
      shapeRendering="crispEdges"
    >
      <path d={d} fill="currentColor" />
    </svg>
  );
}

/** A real QR code. Scan it and it opens what `value` says. */
export function Qr({ value, label, className }: { value: string; label: string; className?: string }) {
  const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
  const n = modules.size;
  let d = "";
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (!modules.data[y * n + x]) continue;
      let w = 1;
      while (x + w < n && modules.data[y * n + x + w]) w++;
      d += `M${x} ${y}h${w}v1h-${w}z`;
      x += w - 1;
    }
  }
  return (
    <svg className={className} viewBox={`0 0 ${n} ${n}`} role="img" aria-label={label} shapeRendering="crispEdges">
      <path d={d} fill="currentColor" />
    </svg>
  );
}
