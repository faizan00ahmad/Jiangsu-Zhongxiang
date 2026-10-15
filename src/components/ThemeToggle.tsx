"use client";
import { useId, useSyncExternalStore } from "react";
import { motion } from "framer-motion";

type Theme = "dark" | "light";
export const THEME_KEY = "zx-theme";

const subscribe = (cb: () => void) => {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
};
const snapshot = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");

/** Sun ⇄ moon switch with a circular reveal (View Transitions), cross-fade fallback. Choice is remembered. */
export default function ThemeToggle({ labels, className = "" }: { labels: { light: string; dark: string }; className?: string }) {
  const theme = useSyncExternalStore(subscribe, snapshot, () => "dark" as Theme);
  const light = theme === "light";
  const maskId = useId().replace(/:/g, "");

  async function toggle(e: React.MouseEvent<HTMLButtonElement>) {
    const next: Theme = light ? "dark" : "light";
    const apply = () => {
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {}
    };
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = document.documentElement;
    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    if (!reduce && "startViewTransition" in document) {
      const t = (document as Document & { startViewTransition: (cb: () => void) => { ready: Promise<void> } }).startViewTransition(apply);
      try {
        await t.ready;
        root.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] }, { duration: 750, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(root)" });
      } catch {}
    } else {
      root.classList.add("theme-fade");
      apply();
      setTimeout(() => root.classList.remove("theme-fade"), 600);
    }
  }

  return (
    <button onClick={toggle} aria-label={light ? labels.dark : labels.light} aria-pressed={light} title={light ? labels.dark : labels.light} data-magnetic className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-ink/15 bg-ink/5 text-ink transition-colors hover:border-[var(--volt)] hover:bg-[var(--volt)]/15 ${className}`}>
      <motion.svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" initial={false} animate={{ rotate: light ? 90 : 40 }} transition={{ type: "spring", stiffness: 120, damping: 14 }}>
        <defs>
          <mask id={maskId}>
            <rect x="0" y="0" width="24" height="24" fill="#fff" />
            <motion.circle r="7" fill="#000" initial={false} animate={{ cx: light ? 32 : 17, cy: light ? -8 : 6 }} transition={{ type: "spring", stiffness: 90, damping: 15 }} />
          </mask>
        </defs>
        <motion.circle cx="12" cy="12" fill="currentColor" stroke="none" mask={`url(#${maskId})`} initial={false} animate={{ r: light ? 5 : 9 }} transition={{ type: "spring", stiffness: 120, damping: 14 }} />
        <motion.g initial={false} animate={{ opacity: light ? 1 : 0, scale: light ? 1 : 0.3 }} style={{ transformOrigin: "12px 12px" }} transition={{ duration: 0.35 }}>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <line key={a} x1="12" y1="1.5" x2="12" y2="4" transform={`rotate(${a} 12 12)`} />
          ))}
        </motion.g>
      </motion.svg>
    </button>
  );
}
