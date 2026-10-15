"use client";
import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Reveal, SplitText } from "./ui";

/** Inner-page banner in the REVOO grey, with the masked headline reveal and a soft fade on scroll. */
export default function PageHeader({ eyebrow, title, text, children, accent = "#16b364", glow = "22,179,100" }: { eyebrow?: string; title: string; text?: string; children?: React.ReactNode; accent?: string; glow?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const op = useTransform(scrollYProgress, [0, 0.85], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [0, 60]);
  return (
    <div ref={ref} className="banner relative isolate mb-10 overflow-hidden pb-12 pt-32 md:pb-14 md:pt-36" style={{ ["--accent" as string]: accent, ["--accent-rgb" as string]: glow } as React.CSSProperties}>
      <motion.div style={{ opacity: op, y }} className="mx-auto max-w-7xl px-6">
        {eyebrow && (
          <p className="mb-4 inline-flex items-center gap-2 rounded bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#111]/70">
            <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
            {eyebrow}
          </p>
        )}
        <SplitText as="h1" text={title} animateNow className="font-display max-w-4xl text-4xl font-bold leading-[1.05] tracking-tight text-[#111] md:text-6xl" />
        {text && (
          <Reveal delay={0.2}>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#111]/65 md:text-lg">{text}</p>
          </Reveal>
        )}
        {children}
      </motion.div>
    </div>
  );
}
