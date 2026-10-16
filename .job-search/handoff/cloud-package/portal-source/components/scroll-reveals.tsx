"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { animate } from "motion/react";
export function ScrollReveals() {
  const path = usePathname();
  useEffect(() => {
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    const animations: ReturnType<typeof animate>[] = [];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          animations.push(
            animate(
              entry.target as HTMLElement,
              { opacity: [0.35, 1], y: reduce.matches ? [0, 0] : [10, 0] },
              { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
            ),
          );
        }
      },
      { threshold: 0.12 },
    );
    document
      .querySelectorAll(
        ".section-heading,.process-item,.service-tile,.experience-item,.price-card,.principles article,.lab-card",
      )
      .forEach((element) => {
        if (element.getBoundingClientRect().top > innerHeight * 0.8)
          observer.observe(element);
      });
    return () => {
      observer.disconnect();
      animations.forEach((a) => a.stop());
    };
  }, [path]);
  return null;
}
