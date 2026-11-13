"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "./track";

const GAP = 26;
const REACH = 150;

/**
 * A field of fine dots behind the hero. A ripple runs through it once on load, and the dots near
 * the pointer swell and lean away from it. It only draws while something is changing.
 */
export function DotField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const host = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !host || !ctx) return;

    const still = prefersReducedMotion();
    let w = 0;
    let h = 0;
    let px = -9999;
    let py = -9999;
    let frame = 0;
    let born = performance.now();
    let rippling = !still;

    const draw = () => {
      frame = 0;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const ox = w * 0.74;
      const oy = h * 0.42;
      const front = rippling ? ((performance.now() - born) / 1000) * 760 : Infinity;
      for (let y = GAP / 2; y < h; y += GAP) {
        for (let x = GAP / 2; x < w; x += GAP) {
          const fromOrigin = Math.hypot(x - ox, y - oy);
          if (fromOrigin > front + 70) continue;
          const d = Math.hypot(x - px, y - py);
          const near = d < REACH ? 1 - d / REACH : 0;
          const wave = rippling ? Math.max(0, 1 - Math.abs(fromOrigin - front) / 70) : 0;
          const k = Math.max(near, wave * 0.75);
          const push = near * near * 7;
          const dx = d ? ((x - px) / d) * push : 0;
          const dy = d ? ((y - py) / d) * push : 0;
          ctx.fillStyle = k > 0.02 ? `rgba(105,121,147,${0.22 + k * 0.7})` : "rgba(23,23,23,0.13)";
          ctx.beginPath();
          ctx.arc(x + dx, y + dy, 1 + k * 1.5, 0, 6.2832);
          ctx.fill();
        }
      }
      if (rippling) {
        if (front > Math.hypot(w, h) + 140) rippling = false;
        frame = requestAnimationFrame(draw);
      }
    };
    const queue = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = host.clientWidth;
      h = host.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      queue();
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const box = host.getBoundingClientRect();
      px = event.clientX - box.left;
      py = event.clientY - box.top;
      queue();
    };
    const leave = () => {
      px = -9999;
      py = -9999;
      queue();
    };

    born = performance.now();
    resize();
    const watcher = new ResizeObserver(resize);
    watcher.observe(host);
    if (!still) {
      host.addEventListener("pointermove", move);
      host.addEventListener("pointerleave", leave);
    }
    return () => {
      watcher.disconnect();
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <canvas ref={ref} className="hx-dots" aria-hidden="true" />;
}
