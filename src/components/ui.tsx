"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useMotionValue, useSpring, useTransform, type HTMLMotionProps } from "framer-motion";
import { ChevronFwd } from "./Icons";

export const ease = [0.22, 1, 0.36, 1] as const;

/** Fade/slide up when scrolled into view. */
export function Reveal({ children, delay = 0, y = 40, className = "", as = "div" }: { children: React.ReactNode; delay?: number; y?: number; className?: string; as?: "div" | "li" | "section" | "p" }) {
  const M = motion[as] as typeof motion.div;
  return (
    <M initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-8% 0px" }} transition={{ duration: 0.9, delay, ease }} className={className}>
      {children}
    </M>
  );
}

/** Box that unrolls with a clip-path wipe as it enters the viewport. */
export function Wipe({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div initial={{ clipPath: "inset(0 100% 0 0)", scale: 1.06 }} whileInView={{ clipPath: "inset(0 0% 0 0)", scale: 1 }} viewport={{ once: true, margin: "-8% 0px" }} transition={{ duration: 1.1, delay, ease: [0.76, 0, 0.24, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

/** Word-by-word masked headline reveal. `accent` words get the gradient treatment. Works for Urdu words too. */
export function SplitText({ text, className = "", delay = 0, accent = [] as string[], as: Tag = "h2", animateNow = false }: { text: string; className?: string; delay?: number; accent?: string[]; as?: "h1" | "h2" | "h3" | "p"; animateNow?: boolean }) {
  const words = text.split(" ");
  const strip = (w: string) => w.replace(/[.,!?،۔]/g, "");
  return (
    <Tag className={className} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} className="split-word inline-block overflow-hidden pb-[0.12em] align-top" aria-hidden>
          <motion.span
            className={`inline-block ${accent.includes(strip(w)) ? "text-grad" : ""}`}
            initial={{ y: "110%", rotate: 6 }}
            {...(animateNow ? { animate: { y: 0, rotate: 0 } } : { whileInView: { y: 0, rotate: 0 }, viewport: { once: true } })}
            transition={{ duration: 0.9, delay: delay + i * 0.06, ease }}
          >
            {w}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

/** Element drifts toward the cursor. */
export function Magnetic({ children, strength = 0.3, className = "" }: { children: React.ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 16 });
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 16 });
  return (
    <motion.div
      ref={ref}
      data-magnetic
      className={`inline-block ${className}`}
      style={{ x, y }}
      onMouseMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * strength);
        y.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

type BtnVariant = "solid" | "ghost" | "light" | "dark";
/** Pill button with magnetic pull + shine. Renders a Link, <a> or <button>. */
export function Button({ href, children, variant = "solid", className = "", arrow = true, magnetic = true, ...rest }: { href?: string; children: React.ReactNode; variant?: BtnVariant; className?: string; arrow?: boolean; magnetic?: boolean } & Omit<HTMLMotionProps<"button">, "children">) {
  const base = "btn-shine group inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md px-6 py-2.5 text-[14px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
  const v = {
    solid: "bg-[#111] text-white hover:bg-black",
    dark: "bg-[#111] text-white hover:bg-black",
    light: "bg-white text-[#111] shadow-sm hover:bg-[#f4f4f5]",
    ghost: "border border-black/20 bg-white text-[#111] hover:border-black",
  }[variant];
  const inner = (
    <>
      {children}
      {arrow && <ChevronFwd size={15} className="text-[var(--volt)] transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />}
    </>
  );
  const cls = `${base} ${v} ${className}`;
  const el = href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <motion.button className={cls} {...rest}>
      {inner}
    </motion.button>
  );
  return magnetic ? <Magnetic>{el}</Magnetic> : el;
}

/** Counts up when visible. */
export function Counter({ to, suffix = "", className = "" }: { to: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const c = reduce ? undefined : animate(0, to, { duration: 2, ease: "easeOut", onUpdate: (n) => setV(Math.round(n)) });
    const done = setTimeout(() => setV(to), reduce ? 0 : 2500);
    return () => {
      c?.stop();
      clearTimeout(done);
    };
  }, [inView, to]);
  return (
    <span ref={ref} className={`latin-d ${className}`}>
      {v.toLocaleString("en-US")}
      {suffix}
    </span>
  );
}

/** Smoothly tweens between numbers (the live price). */
export function TweenNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const [v, setV] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const c = animate(from.current, value, { duration: 0.6, ease: "easeOut", onUpdate: (n) => setV(Math.round(n)) });
    from.current = value;
    return () => c.stop();
  }, [value]);
  return <>{format(v)}</>;
}

/** Card with 3D tilt + mouse-tracking spotlight border. */
export function SpotCard({ children, className = "", tilt = 5, ...rest }: { children: React.ReactNode; className?: string; tilt?: number } & React.HTMLAttributes<HTMLElement>) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useSpring(useMotionValue(0), { stiffness: 200, damping: 18 });
  const ry = useSpring(useMotionValue(0), { stiffness: 200, damping: 18 });
  const transform = useTransform([rx, ry], ([a, b]) => `perspective(900px) rotateX(${a}deg) rotateY(${b}deg)`);
  return (
    <motion.div
      ref={ref}
      {...(rest as object)}
      className={`spot ${className}`}
      style={{ transform }}
      onMouseMove={(e) => {
        const el = ref.current!;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        el.style.setProperty("--mx", `${px * 100}%`);
        el.style.setProperty("--my", `${py * 100}%`);
        ry.set((px - 0.5) * tilt * 2);
        rx.set(-(py - 0.5) * tilt * 2);
      }}
      onMouseLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/** Infinite horizontal marquee. */
export function Marquee({ children, reverse = false, duration = 40, className = "" }: { children: React.ReactNode; reverse?: boolean; duration?: number; className?: string }) {
  return (
    <div className={`marquee-wrap overflow-hidden ${className}`}>
      <div className={`marquee ${reverse ? "rev" : ""}`} style={{ ["--dur" as string]: `${duration}s` }}>
        <div className="flex shrink-0 items-center">{children}</div>
        <div className="flex shrink-0 items-center" aria-hidden>
          {children}
        </div>
      </div>
    </div>
  );
}

export function SectionTitle({ eyebrow, title, accent, className = "", size = "lg" }: { eyebrow?: string; title: string; accent?: string[]; className?: string; size?: "lg" | "md" }) {
  return (
    <div className={className}>
      {eyebrow && (
        <Reveal y={16}>
          <p className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.35em] text-[var(--accent)]">
            <span className="h-px w-10 bg-current" />
            {eyebrow}
          </p>
        </Reveal>
      )}
      <SplitText text={title} accent={accent} className={`font-display font-semibold leading-[1.1] tracking-tight ${size === "lg" ? "text-3xl md:text-5xl" : "text-2xl md:text-4xl"}`} />
    </div>
  );
}

/** Inline bilingual notice (used for errors and empty states instead of pop-ups). */
export function Notice({ tone = "info", children, className = "" }: { tone?: "info" | "error" | "ok"; children: React.ReactNode; className?: string }) {
  const c = tone === "error" ? "border-red-500/40 bg-red-500/10 text-red-700" : tone === "ok" ? "border-[var(--volt)]/40 bg-[var(--volt)]/10" : "border-ink/15 bg-ink/[0.04]";
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-2xl border px-4 py-3 text-sm ${c} ${className}`}>
      {children}
    </div>
  );
}
